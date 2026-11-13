-- Consolidate historical per-prompt helpdesk records that predate session IDs.
-- Since exact chat_messages matches are unavailable for many older records,
-- group only same-user prompts separated by no more than 30 minutes. Keep a
-- structured transcript in metadata so the detail modal can render each turn.
DROP INDEX IF EXISTS public.monitor_inquiries_session_id_uidx;

WITH ordered AS (
  SELECT
    id, user_id, created_at,
    lag(created_at) OVER (PARTITION BY user_id ORDER BY created_at, id) AS previous_at
  FROM public.monitor_inquiries
  WHERE session_id IS NULL
),
marked AS (
  SELECT *,
    CASE WHEN previous_at IS NULL OR created_at - previous_at > interval '30 minutes'
      THEN 1 ELSE 0 END AS starts_group
  FROM ordered
),
grouped AS (
  SELECT *,
    sum(starts_group) OVER (PARTITION BY user_id ORDER BY created_at, id) AS group_number
  FROM marked
),
group_keys AS (
  SELECT user_id, group_number, min(created_at) AS group_started_at,
    'legacy-' || md5(user_id::text || ':' || min(created_at)::text) AS legacy_session_id
  FROM grouped
  GROUP BY user_id, group_number
)
UPDATE public.monitor_inquiries mi
SET session_id = gk.legacy_session_id,
    updated_at = now()
FROM grouped g
JOIN group_keys gk USING (user_id, group_number)
WHERE mi.id = g.id;

-- For each recovered legacy group, preserve every prompt/reply as an ordered
-- structured transcript, then keep one compact list row.
WITH grouped_rows AS (
  SELECT
    session_id,
    (array_agg(id ORDER BY created_at, id))[1] AS keep_id,
    count(*)::integer AS row_count,
    jsonb_agg(
      jsonb_build_array(
        jsonb_build_object('sender','user','content',user_message,'created_at',created_at),
        jsonb_build_object('sender','ai','content',bot_response,'created_at',created_at)
      ) ORDER BY created_at, id
    ) AS paired_turns,
    string_agg(user_message, E'\n\n' ORDER BY created_at, id) AS all_user_messages,
    string_agg(bot_response, E'\n\n' ORDER BY created_at, id) AS all_bot_replies
  FROM public.monitor_inquiries
  WHERE session_id LIKE 'legacy-%'
  GROUP BY session_id
),
flattened AS (
  SELECT
    session_id,
    keep_id,
    row_count,
    all_user_messages,
    all_bot_replies,
    (
      SELECT jsonb_agg(turn.value ORDER BY pair.pair_order, turn.turn_order)
      FROM jsonb_array_elements(paired_turns) WITH ORDINALITY AS pair(turns, pair_order),
           LATERAL jsonb_array_elements(pair.turns) WITH ORDINALITY AS turn(value, turn_order)
    ) AS conversation_history
  FROM grouped_rows
)
UPDATE public.monitor_inquiries mi
SET user_message = f.all_user_messages,
    bot_response = f.all_bot_replies,
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(COALESCE(mi.metadata, '{}'::jsonb), '{message_count}', to_jsonb(f.row_count), true),
        '{consolidated_log_rows}', to_jsonb(f.row_count), true
      ),
      '{conversation_history}', COALESCE(f.conversation_history, '[]'::jsonb), true
    ),
    updated_at = now()
FROM flattened f
WHERE mi.id = f.keep_id;

WITH ranked AS (
  SELECT id,
    row_number() OVER (PARTITION BY session_id ORDER BY created_at, id) AS row_rank
  FROM public.monitor_inquiries
  WHERE session_id LIKE 'legacy-%'
)
DELETE FROM public.monitor_inquiries mi
USING ranked r
WHERE mi.id = r.id AND r.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS monitor_inquiries_session_id_uidx
  ON public.monitor_inquiries (session_id)
  WHERE session_id IS NOT NULL;
