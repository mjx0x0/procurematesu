-- Separate digital draft creation from physical submission and office receipt.
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS physical_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS physical_received_at timestamptz;

COMMENT ON COLUMN public.purchase_requests.physical_submitted_at IS
  'Timestamp when the end user declares that the printed PR was physically handed to the Procurement Office.';
COMMENT ON COLUMN public.purchase_requests.physical_received_at IS
  'Timestamp when an authorized administrator confirms actual physical receipt.';

-- Drafts stay private until the owner declares physical submission.
CREATE OR REPLACE FUNCTION public.submit_purchase_request_physically(p_pr_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pr public.purchase_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_pr
  FROM public.purchase_requests
  WHERE pr_no = p_pr_no AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase Request not found or access denied.';
  END IF;
  IF v_pr.current_stage <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft Purchase Request can be declared physically submitted.';
  END IF;
  IF v_pr.physical_submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('pr', to_jsonb(v_pr), 'already_submitted', true);
  END IF;

  UPDATE public.purchase_requests
  SET physical_submitted_at = now(), updated_at = now()
  WHERE pr_no = p_pr_no
  RETURNING * INTO v_pr;

  RETURN jsonb_build_object('pr', to_jsonb(v_pr), 'already_submitted', false);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_purchase_request_physically(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_purchase_request_physically(text) TO authenticated;

-- Owner-only atomic draft editing. Items are replaced in the same transaction.
CREATE OR REPLACE FUNCTION public.update_purchase_request_draft(
  p_pr_no text,
  p_request jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pr public.purchase_requests%ROWTYPE;
  v_item record;
  v_items jsonb;
  v_total numeric := 0;
  v_count integer;
BEGIN
  SELECT * INTO v_pr
  FROM public.purchase_requests
  WHERE pr_no = p_pr_no AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase Request not found or access denied.';
  END IF;
  IF v_pr.current_stage <> 'draft' OR v_pr.physical_submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This Purchase Request is no longer editable.';
  END IF;
  IF p_request IS NULL OR jsonb_typeof(p_request) <> 'object'
     OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Invalid Purchase Request data.';
  END IF;

  SELECT count(*) INTO v_count FROM jsonb_array_elements(p_items);
  IF v_count < 1 OR v_count > 50 THEN
    RAISE EXCEPTION 'A Purchase Request must contain between 1 and 50 items.';
  END IF;
  SELECT COALESCE(sum((item->>'quantity')::numeric * (item->>'unit_cost')::numeric), 0)
  INTO v_total FROM jsonb_array_elements(p_items) AS item;
  IF v_total < 0 OR v_total > 1000000000000 THEN
    RAISE EXCEPTION 'Purchase Request total is outside the permitted range.';
  END IF;

  UPDATE public.purchase_requests
  SET department = p_request->>'department',
      section = NULLIF(p_request->>'section', ''),
      purpose = p_request->>'purpose',
      printed_name = p_request->>'printed_name',
      designation = NULLIF(p_request->>'designation', ''),
      total = v_total,
      updated_at = now()
  WHERE pr_no = p_pr_no
  RETURNING * INTO v_pr;

  DELETE FROM public.pr_items WHERE pr_no = p_pr_no;
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(
      item_description text, quantity integer, unit text, unit_cost numeric, total_cost numeric
    )
  LOOP
    IF v_item.item_description IS NULL OR btrim(v_item.item_description) = ''
       OR v_item.quantity IS NULL OR v_item.quantity < 1
       OR v_item.unit_cost IS NULL OR v_item.unit_cost < 0 THEN
      RAISE EXCEPTION 'A Purchase Request item contains invalid values.';
    END IF;
    INSERT INTO public.pr_items(pr_no,item_description,quantity,unit,unit_cost,total_cost)
    VALUES(p_pr_no,btrim(v_item.item_description),v_item.quantity,
      COALESCE(NULLIF(btrim(v_item.unit),''),'pcs'),v_item.unit_cost,
      v_item.quantity::numeric*v_item.unit_cost);
  END LOOP;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at), '[]'::jsonb)
  INTO v_items FROM public.pr_items i WHERE i.pr_no = p_pr_no;
  RETURN jsonb_build_object('pr',to_jsonb(v_pr),'items',v_items);
END;
$$;
REVOKE ALL ON FUNCTION public.update_purchase_request_draft(text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_purchase_request_draft(text,jsonb,jsonb) TO authenticated;

-- Replace insert-time notification: saving a draft is private and silent.
DROP TRIGGER IF EXISTS trg_notify_admins_new_purchase_request ON public.purchase_requests;
DROP TRIGGER IF EXISTS trg_notify_admins_physical_submission ON public.purchase_requests;

CREATE OR REPLACE FUNCTION private.notify_admins_of_physical_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.physical_submitted_at IS NULL AND NEW.physical_submitted_at IS NOT NULL THEN
    INSERT INTO public.notifications (user_id,pr_no,type,title,message,is_read)
    SELECT u.id,NEW.pr_no,'pr_physical_submission','PR Awaiting Physical Receipt',
      'A Purchase Request from ' ||
      COALESCE(NULLIF(btrim(NEW.department),''),'a university office') ||
      ' has been declared physically submitted and is awaiting your receipt confirmation.',false
    FROM public.users u
    WHERE u.role='admin' AND u.status='approved' AND u.is_active IS TRUE
      AND u.id IS DISTINCT FROM NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.notify_admins_of_physical_submission() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_admins_physical_submission
  AFTER UPDATE OF physical_submitted_at ON public.purchase_requests
  FOR EACH ROW
  WHEN (OLD.physical_submitted_at IS NULL AND NEW.physical_submitted_at IS NOT NULL)
  EXECUTE FUNCTION private.notify_admins_of_physical_submission();

-- Existing workflow action now requires the end-user declaration before Stage 1.
CREATE OR REPLACE FUNCTION public.assert_pr_physical_receipt_before_stage_one()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.current_stage = 'draft' AND NEW.current_stage = 'receipt_of_pr' THEN
    IF OLD.physical_submitted_at IS NULL THEN
      RAISE EXCEPTION 'The end user has not declared physical submission of this Purchase Request.';
    END IF;
    NEW.physical_received_at := COALESCE(NEW.physical_received_at, now());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assert_pr_physical_receipt_before_stage_one ON public.purchase_requests;
CREATE TRIGGER trg_assert_pr_physical_receipt_before_stage_one
  BEFORE UPDATE OF current_stage ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_pr_physical_receipt_before_stage_one();
