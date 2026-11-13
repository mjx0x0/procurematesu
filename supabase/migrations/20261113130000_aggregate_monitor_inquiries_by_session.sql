-- Store one admin-facing inquiry log per chatbot conversation session.
-- Existing per-prompt rows remain intact; new prompts update the session row.
ALTER TABLE public.monitor_inquiries
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS monitor_inquiries_session_id_uidx
  ON public.monitor_inquiries (session_id)
  WHERE session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.append_monitor_inquiry_session(
  p_session_id text,
  p_user_id uuid,
  p_user_name text,
  p_user_department text,
  p_pr_no text,
  p_user_message text,
  p_bot_response text,
  p_inquiry_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR btrim(p_session_id) = '' THEN
    RAISE EXCEPTION 'A chat session ID is required.';
  END IF;
  IF p_user_message IS NULL OR btrim(p_user_message) = '' THEN
    RAISE EXCEPTION 'A user message is required.';
  END IF;

  INSERT INTO public.monitor_inquiries (
    session_id,
    user_id,
    user_name,
    user_department,
    pr_no,
    user_message,
    bot_response,
    inquiry_type,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    p_session_id,
    p_user_id,
    COALESCE(NULLIF(btrim(p_user_name), ''), 'ProcuremateSU User'),
    COALESCE(NULLIF(btrim(p_user_department), ''), 'MSU-GenSan'),
    COALESCE(NULLIF(btrim(p_pr_no), ''), 'N/A'),
    p_user_message,
    COALESCE(p_bot_response, ''),
    COALESCE(NULLIF(btrim(p_inquiry_type), ''), 'general'),
    jsonb_build_object('message_count', 1),
    now(),
    now()
  )
  ON CONFLICT (session_id) WHERE session_id IS NOT NULL
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    user_name = EXCLUDED.user_name,
    user_department = EXCLUDED.user_department,
    pr_no = CASE
      WHEN EXCLUDED.pr_no IS NOT NULL AND EXCLUDED.pr_no <> 'N/A' THEN EXCLUDED.pr_no
      ELSE public.monitor_inquiries.pr_no
    END,
    user_message = concat_ws(E'\n\n', NULLIF(public.monitor_inquiries.user_message, ''), EXCLUDED.user_message),
    bot_response = concat_ws(E'\n\n', NULLIF(public.monitor_inquiries.bot_response, ''), EXCLUDED.bot_response),
    inquiry_type = CASE
      WHEN public.monitor_inquiries.inquiry_type IS NULL OR public.monitor_inquiries.inquiry_type = 'general'
        THEN EXCLUDED.inquiry_type
      ELSE public.monitor_inquiries.inquiry_type
    END,
    metadata = jsonb_set(
      COALESCE(public.monitor_inquiries.metadata, '{}'::jsonb),
      '{message_count}',
      to_jsonb(COALESCE((public.monitor_inquiries.metadata->>'message_count')::integer, 1) + 1),
      true
    ),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.append_monitor_inquiry_session(text, uuid, text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_monitor_inquiry_session(text, uuid, text, text, text, text, text, text)
  TO service_role;
