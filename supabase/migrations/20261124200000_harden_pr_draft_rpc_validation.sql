-- Keep the database RPC safe even if a caller bypasses the application route.
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
  IF length(btrim(COALESCE(p_request->>'department',''))) < 2
     OR length(p_request->>'department') > 200
     OR length(btrim(COALESCE(p_request->>'purpose',''))) < 3
     OR length(p_request->>'purpose') > 2000
     OR length(btrim(COALESCE(p_request->>'printed_name',''))) < 2
     OR length(p_request->>'printed_name') > 120
     OR position('@' IN COALESCE(p_request->>'printed_name','')) > 0
     OR length(COALESCE(p_request->>'section','')) > 200
     OR length(COALESCE(p_request->>'designation','')) > 200 THEN
    RAISE EXCEPTION 'Department, purpose, printed name, or optional details are invalid.';
  END IF;

  SELECT count(*) INTO v_count FROM jsonb_array_elements(p_items);
  IF v_count < 1 OR v_count > 50 THEN
    RAISE EXCEPTION 'A Purchase Request must contain between 1 and 50 items.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS item
    WHERE length(btrim(COALESCE(item->>'item_description',''))) < 1
       OR length(item->>'item_description') > 1000
       OR COALESCE((item->>'quantity')::numeric, 0) < 1
       OR COALESCE((item->>'quantity')::numeric, 0) > 1000000
       OR (item->>'quantity')::numeric <> trunc((item->>'quantity')::numeric)
       OR COALESCE((item->>'unit_cost')::numeric, -1) < 0
       OR COALESCE((item->>'unit_cost')::numeric, -1) > 1000000000
       OR length(COALESCE(item->>'unit','pcs')) > 50
  ) THEN
    RAISE EXCEPTION 'A Purchase Request item contains invalid values.';
  END IF;

  SELECT COALESCE(sum((item->>'quantity')::numeric * (item->>'unit_cost')::numeric), 0)
  INTO v_total FROM jsonb_array_elements(p_items) AS item;
  IF v_total < 0 OR v_total > 1000000000000 THEN
    RAISE EXCEPTION 'Purchase Request total is outside the permitted range.';
  END IF;

  UPDATE public.purchase_requests
  SET department = btrim(p_request->>'department'),
      section = NULLIF(btrim(p_request->>'section'), ''),
      purpose = btrim(p_request->>'purpose'),
      printed_name = btrim(p_request->>'printed_name'),
      designation = NULLIF(btrim(p_request->>'designation'), ''),
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
