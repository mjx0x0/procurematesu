BEGIN;

DROP TABLE IF EXISTS public.rfqs;
DROP TABLE IF EXISTS public.action_logs;

DROP FUNCTION IF EXISTS public.touch_rfqs_updated_at();

COMMIT;
