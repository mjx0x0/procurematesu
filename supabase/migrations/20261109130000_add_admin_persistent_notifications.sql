-- Persistent administrator notifications for procurement operations.
-- Reuse public.notifications so the existing user-owned notification model remains intact.

CREATE INDEX IF NOT EXISTS notifications_unread_by_user_created_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

CREATE OR REPLACE FUNCTION public.notify_admins_of_new_purchase_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, pr_no, type, title, message, is_read)
  SELECT
    admin_user.id,
    NEW.pr_no,
    'pr_created',
    'New Purchase Request',
    'A new Purchase Request from ' ||
      COALESCE(NULLIF(btrim(NEW.department), ''), 'a university office') ||
      ' is awaiting physical receipt confirmation.',
    false
  FROM public.users AS admin_user
  WHERE admin_user.role = 'admin'
    AND admin_user.status = 'approved'
    AND admin_user.is_active IS TRUE
    AND admin_user.id IS DISTINCT FROM NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_of_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'end_user' AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, pr_no, type, title, message, is_read)
    SELECT
      admin_user.id,
      NULL,
      'user_registered',
      'New User Registration',
      COALESCE(NULLIF(btrim(NEW.full_name), ''), 'A university user') ||
        ' (' || NEW.email || ') registered and is awaiting account approval.',
      false
    FROM public.users AS admin_user
    WHERE admin_user.role = 'admin'
      AND admin_user.status = 'approved'
      AND admin_user.is_active IS TRUE
      AND admin_user.id IS DISTINCT FROM NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_of_pr_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO public.notifications (user_id, pr_no, type, title, message, is_read)
    SELECT
      admin_user.id,
      NEW.pr_no,
      'pr_stage_changed',
      'Purchase Request Stage Updated',
      'PR ' || NEW.pr_no || ' moved to ' ||
        replace(COALESCE(NEW.current_stage, 'an unspecified stage'), '_', ' ') || '.',
      false
    FROM public.users AS admin_user
    WHERE admin_user.role = 'admin'
      AND admin_user.status = 'approved'
      AND admin_user.is_active IS TRUE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_of_official_pr_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.pr_no IS DISTINCT FROM NEW.pr_no
     AND position('TEMP' IN upper(COALESCE(OLD.pr_no, ''))) > 0
     AND position('TEMP' IN upper(COALESCE(NEW.pr_no, ''))) = 0 THEN
    INSERT INTO public.notifications (user_id, pr_no, type, title, message, is_read)
    SELECT
      admin_user.id,
      NEW.pr_no,
      'pr_number_assigned',
      'Official PR Number Assigned',
      'The official university control number for this request is ' || NEW.pr_no || '.',
      false
    FROM public.users AS admin_user
    WHERE admin_user.role = 'admin'
      AND admin_user.status = 'approved'
      AND admin_user.is_active IS TRUE;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_of_new_purchase_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_of_new_user_registration() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_of_pr_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_of_official_pr_number() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_admins_new_purchase_request ON public.purchase_requests;
CREATE TRIGGER trg_notify_admins_new_purchase_request
  AFTER INSERT ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_of_new_purchase_request();

DROP TRIGGER IF EXISTS trg_notify_admins_new_user_registration ON public.users;
CREATE TRIGGER trg_notify_admins_new_user_registration
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_of_new_user_registration();

DROP TRIGGER IF EXISTS trg_notify_admins_pr_stage_change ON public.purchase_requests;
CREATE TRIGGER trg_notify_admins_pr_stage_change
  AFTER UPDATE OF current_stage ON public.purchase_requests
  FOR EACH ROW
  WHEN (OLD.current_stage IS DISTINCT FROM NEW.current_stage)
  EXECUTE FUNCTION public.notify_admins_of_pr_stage_change();

DROP TRIGGER IF EXISTS trg_notify_admins_official_pr_number ON public.purchase_requests;
CREATE TRIGGER trg_notify_admins_official_pr_number
  AFTER UPDATE OF pr_no ON public.purchase_requests
  FOR EACH ROW
  WHEN (
    OLD.pr_no IS DISTINCT FROM NEW.pr_no
    AND position('TEMP' IN upper(COALESCE(OLD.pr_no, ''))) > 0
    AND position('TEMP' IN upper(COALESCE(NEW.pr_no, ''))) = 0
  )
  EXECUTE FUNCTION public.notify_admins_of_official_pr_number();

-- Enable Postgres Changes for the existing notifications table so each admin
-- receives only the notification rows addressed to their own account.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
