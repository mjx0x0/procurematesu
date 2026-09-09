-- Keep exactly one auth.users registration trigger for ProcuremateSU.
-- The legacy on_auth_user_created trigger inserted a second profile and
-- could conflict with the new pending/inactive registration workflow.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TRIGGER IF EXISTS on_auth_user_created_procurematesu ON auth.users;

CREATE TRIGGER on_auth_user_created_procurematesu
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_procuremate_user();
