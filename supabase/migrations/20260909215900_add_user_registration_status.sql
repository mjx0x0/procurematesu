-- Account lifecycle state for secure self-registration.
-- Preserve existing active accounts as approved so current users are not locked out.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text;

UPDATE public.users
SET status = CASE
  WHEN is_active = true THEN 'approved'
  ELSE 'rejected'
END
WHERE status IS NULL;

ALTER TABLE public.users
ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users
ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.users
ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS users_status_idx ON public.users(status);
