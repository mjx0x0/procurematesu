-- Backfill historical helpdesk rows to chat sessions only when an exact
-- user-message match has a nearby timestamp in the same local-time window.
-- Then collapse multiple historical rows from that session into one log.
WITH candidates AS (
  SELECT
    mi.id AS inquiry_id,
    cm.session_id::text AS session_id,
    abs(extract(epoch FROM ((cm.created_at AT TIME ZONE 'Asia/Manila') - mi.created_at))) AS time_delta,
    row_number() OVER (
      PARTITION BY mi.id
      ORDER BY abs(extract(epoch FROM ((cm.created_at AT TIME ZONE 'Asia/Manila') - mi.created_at)))
    ) AS match_rank
  FROM public.monitor_inquiries mi
  JOIN public.chat_messages cm
    ON cm.sender = 'user'
   AND cm.content = mi.user_message
  WHERE mi.session_id IS NULL
),
safe_matches AS (
  SELECT inquiry_id, session_id
  FROM candidates
  WHERE match_rank = 1 AND time_delta <= 900
)
UPDATE public.monitor_inquiries mi
SET session_id = safe_matches.session_id,
    updated_at = now()
FROM safe_matches
WHERE mi.id = safe_matches.inquiry_id;

-- Retain the oldest log row per recovered session and populate its preview
-- from the authoritative complete message history.
WITH session_rows AS (
  SELECT
    mi.session_id,
    (array_agg(mi.id ORDER BY mi.created_at, mi.id))[1] AS keep_id,
    count(*)::integer AS log_rows
  FROM public.monitor_inquiries mi
  WHERE mi.session_id IS NOT NULL
  GROUP BY mi.session_id
),
session_messages AS (
  SELECT
    cm.session_id::text AS session_id,
    string_agg(cm.content, E'\n\n' ORDER BY cm.created_at, cm.id)
      FILTER (WHERE cm.sender = 'user') AS all_user_messages,
    string_agg(cm.content, E'\n\n' ORDER BY cm.created_at, cm.id)
      FILTER (WHERE cm.sender IN ('ai', 'assistant')) AS all_bot_replies,
    count(*) FILTER (WHERE cm.sender = 'user')::integer AS user_turn_count
  FROM public.chat_messages cm
  GROUP BY cm.session_id
)
UPDATE public.monitor_inquiries mi
SET user_message = COALESCE(NULLIF(sm.all_user_messages, ''), mi.user_message),
    bot_response = COALESCE(NULLIF(sm.all_bot_replies, ''), mi.bot_response),
    metadata = jsonb_set(
      jsonb_set(COALESCE(mi.metadata, '{}'::jsonb), '{message_count}', to_jsonb(GREATEST(COALESCE(sm.user_turn_count, 1), 1)), true),
      '{consolidated_log_rows}', to_jsonb(sr.log_rows), true
    ),
    updated_at = now()
FROM session_rows sr
LEFT JOIN session_messages sm ON sm.session_id = sr.session_id
WHERE mi.id = sr.keep_id;

-- Remove only duplicate monitor rows whose session association was safely
-- recovered above. Chat message history itself is never deleted.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY session_id ORDER BY created_at, id) AS row_rank
  FROM public.monitor_inquiries
  WHERE session_id IS NOT NULL
)
DELETE FROM public.monitor_inquiries mi
USING ranked r
WHERE mi.id = r.id AND r.row_rank > 1;
