-- Migration to allow 'draft' as initial stage and handle physical receipt confirmation.

CREATE OR REPLACE FUNCTION public.initialize_procurement_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Allow 'draft' as the initial stage
  IF NEW.current_stage IS NULL THEN NEW.current_stage := 'draft'; END IF;
  IF NEW.current_status IS NULL THEN NEW.current_status := 'draft'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_initial_procurement_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Record the initial 'draft' stage entry
  IF NEW.current_stage = 'draft' THEN
    INSERT INTO public.pr_stages_completed (pr_no, stage_key, stage_name, status, completed_at, remarks)
    VALUES (NEW.pr_no, 'draft', 'Draft', 'completed', COALESCE(NEW.created_at, now()), 'Purchase Request drafted by end-user.');
  END IF;
  RETURN NEW;
END;
$$;
