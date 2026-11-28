CREATE TABLE IF NOT EXISTS public.pr_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_no text NOT NULL REFERENCES public.purchase_requests(pr_no) ON UPDATE CASCADE ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('end_user', 'admin')),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_messages_pr_no_created_at
  ON public.pr_messages (pr_no, created_at);

ALTER TABLE public.pr_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pr_messages FROM anon, authenticated;
GRANT ALL ON public.pr_messages TO service_role;
