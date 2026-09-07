-- Ensure sequence exists
CREATE SEQUENCE IF NOT EXISTS public.purchase_request_number_seq;

-- Reseed sequence based on the highest PR number across the whole table
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

-- Generate purchase request number function with RLS bypass and collision immunity
CREATE OR REPLACE FUNCTION public.generate_purchase_request_number()
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_no bigint;
  max_existing bigint;
  candidate varchar;
  yr varchar;
BEGIN
  yr := to_char(current_date, 'YYYY');

  -- Ensure next sequence value is strictly greater than all existing PRs
  SELECT COALESCE(MAX(substring(pr_no FROM '^PR-[0-9]{4}-([0-9]+)$')::bigint), 0)
  INTO max_existing
  FROM public.purchase_requests;

  next_no := nextval('public.purchase_request_number_seq');
  IF next_no <= max_existing THEN
    PERFORM setval('public.purchase_request_number_seq', max_existing + 1, false);
    next_no := max_existing + 1;
  END IF;

  candidate := 'PR-' || yr || '-' || lpad(next_no::text, 4, '0');

  -- Collision guard: loop until unused candidate is found
  WHILE EXISTS (SELECT 1 FROM public.purchase_requests WHERE pr_no = candidate) LOOP
    next_no := nextval('public.purchase_request_number_seq');
    candidate := 'PR-' || yr || '-' || lpad(next_no::text, 4, '0');
  END LOOP;

  RETURN candidate;
END;
$$;

-- Trigger to assign PR number before insert if omitted
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

-- Drop any conflicting legacy triggers
DROP TRIGGER IF EXISTS trg_assign_purchase_request_number ON public.purchase_requests;
DROP TRIGGER IF EXISTS trg_auto_pr_no ON public.purchase_requests;
DROP TRIGGER IF EXISTS auto_generate_pr_number ON public.purchase_requests;

CREATE TRIGGER trg_assign_purchase_request_number
BEFORE INSERT ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.assign_purchase_request_number();

-- Grant proper execution and sequence usage rights
GRANT USAGE, SELECT ON SEQUENCE public.purchase_request_number_seq TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.generate_purchase_request_number() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.assign_purchase_request_number() TO authenticated, service_role, anon;

