CREATE SEQUENCE IF NOT EXISTS public.purchase_request_number_seq;

DO $$
DECLARE
  max_no bigint;
BEGIN
  SELECT COALESCE(MAX(substring(pr_no FROM '^PR-[0-9]{4}-([0-9]+)$')::bigint), 0)
  INTO max_no
  FROM public.purchase_requests;
  IF max_no > 0 THEN
    PERFORM setval('public.purchase_request_number_seq', max_no, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_purchase_request_number()
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'PR-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.purchase_request_number_seq')::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_purchase_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pr_no IS NULL OR btrim(NEW.pr_no) = '' OR NEW.pr_no = 'Auto-generated' THEN
    NEW.pr_no := public.generate_purchase_request_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_purchase_request_number ON public.purchase_requests;
CREATE TRIGGER trg_assign_purchase_request_number
BEFORE INSERT ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.assign_purchase_request_number();
