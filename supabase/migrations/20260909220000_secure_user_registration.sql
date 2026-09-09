-- Secure self-registration for ProcuremateSU end-user accounts.
-- New registrations are created as pending/inactive end users.
-- Existing accounts are not changed by this trigger.

CREATE OR REPLACE FUNCTION public.handle_new_procuremate_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata_full_name text;
  metadata_department text;
  metadata_college text;
BEGIN
  metadata_full_name := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');
  metadata_department := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'department', '')), '');
  metadata_college := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'college', '')), '');

  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    department,
    college,
    is_active,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(metadata_full_name, split_part(NEW.email, '@', 1)),
    'end_user',
    metadata_department,
    metadata_college,
    false,
    'pending',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_procurematesu ON auth.users;

CREATE TRIGGER on_auth_user_created_procurematesu
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_procuremate_user();
