-- Allow administrators to correct a temporary PR tracking number during Step 4.
-- The existing ON UPDATE CASCADE foreign keys keep PR items and stage history linked.
CREATE OR REPLACE FUNCTION public.update_temporary_purchase_request_number(
  p_current_pr_no text,
  p_new_temporary_pr_no text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pr public.purchase_requests%ROWTYPE;
  v_new_no text := upper(btrim(COALESCE(p_new_temporary_pr_no, '')));
  v_history jsonb;
BEGIN
  IF p_current_pr_no IS NULL OR btrim(p_current_pr_no) = '' THEN
    RAISE EXCEPTION 'Current temporary PR number is required.';
  END IF;
  IF v_new_no !~ '^PR-TEMP-[A-Z0-9-]{3,32}$' THEN
    RAISE EXCEPTION 'Temporary PR number must use the format PR-TEMP-YYYY-XXXX.';
  END IF;

  SELECT * INTO v_pr
  FROM public.purchase_requests
  WHERE pr_no = p_current_pr_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase Request not found.';
  END IF;
  IF v_pr.current_stage <> 'pr_pre_numbering' OR position('TEMP' IN upper(v_pr.pr_no)) = 0 THEN
    RAISE EXCEPTION 'Only temporary PR numbers at Step 4 may be changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.purchase_requests WHERE pr_no = v_new_no AND pr_no <> p_current_pr_no) THEN
    RAISE EXCEPTION 'That temporary PR number is already in use.';
  END IF;

  UPDATE public.purchase_requests
  SET pr_no = v_new_no, updated_at = now()
  WHERE pr_no = p_current_pr_no
  RETURNING * INTO v_pr;

  SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.completed_at, h.created_at), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT stage_name, stage_key, completed_at, remarks, status, created_at
    FROM public.pr_stages_completed
    WHERE pr_no = v_pr.pr_no
  ) h;

  RETURN jsonb_build_object(
    'updatedPR', to_jsonb(v_pr),
    'stageHistory', v_history,
    'oldPrNo', p_current_pr_no,
    'temporaryPrNo', v_pr.pr_no
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.update_temporary_purchase_request_number(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_temporary_purchase_request_number(text, text) TO service_role;
