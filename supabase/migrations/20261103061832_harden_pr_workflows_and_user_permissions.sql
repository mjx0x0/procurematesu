-- Keep authorization decisions aligned with the account-approval workflow.
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active IS TRUE
      AND status = 'approved'
  );
$function$;

-- End users and browser clients must not mutate account authorization fields.
REVOKE INSERT, UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, email, password, full_name, role, department, college, is_active, created_at, updated_at, status),
       UPDATE (id, email, password, full_name, role, department, college, is_active, created_at, updated_at, status)
  ON TABLE public.users FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can update own active profile" ON public.users;

-- PR creation and modification are performed only through authenticated server endpoints.
-- Direct INSERT would bypass server-side validation and could create a PR in any stage.
REVOKE INSERT, UPDATE ON TABLE public.purchase_requests FROM PUBLIC, anon, authenticated;
REVOKE INSERT (pr_no, user_id, department, sai_no, alobs_no, purpose, item_description, quantity, unit_cost, total, total_cost, printed_name, designation, section, pr_date, current_stage, current_status, created_at, updated_at, tracking_id),
       UPDATE (pr_no, user_id, department, sai_no, alobs_no, purpose, item_description, quantity, unit_cost, total, total_cost, printed_name, designation, section, pr_date, current_stage, current_status, created_at, updated_at, tracking_id)
  ON TABLE public.purchase_requests FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can insert own active PRs" ON public.purchase_requests;
DROP POLICY IF EXISTS "Authenticated users can update permitted PRs" ON public.purchase_requests;

-- PR item inserts/updates are server-controlled. Keep admin-only DELETE unchanged.
REVOKE INSERT, UPDATE ON TABLE public.pr_items FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, pr_no, item_description, quantity, unit, unit_cost, total_cost, created_at),
       UPDATE (id, pr_no, item_description, quantity, unit, unit_cost, total_cost, created_at)
  ON TABLE public.pr_items FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Authenticated users can insert permitted PR items" ON public.pr_items;
DROP POLICY IF EXISTS "Authenticated users can update permitted PR items" ON public.pr_items;

-- Create a PR, its items, and its initial history in one Postgres transaction.
CREATE OR REPLACE FUNCTION public.create_purchase_request_with_items(
  p_request jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pr public.purchase_requests%ROWTYPE;
  v_item record;
  v_items jsonb;
  v_total numeric := 0;
  v_count integer := 0;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request) <> 'object' THEN
    RAISE EXCEPTION 'Invalid Purchase Request data.';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Purchase Request items must be an array.';
  END IF;

  SELECT count(*) INTO v_count FROM jsonb_array_elements(p_items);
  IF v_count < 1 OR v_count > 50 THEN
    RAISE EXCEPTION 'A Purchase Request must contain between 1 and 50 items.';
  END IF;

  SELECT COALESCE(sum((item->>'quantity')::numeric * (item->>'unit_cost')::numeric), 0)
  INTO v_total
  FROM jsonb_array_elements(p_items) AS item;

  IF v_total < 0 OR v_total > 1000000000000 THEN
    RAISE EXCEPTION 'Purchase Request total is outside the permitted range.';
  END IF;

  INSERT INTO public.purchase_requests (
    pr_no, user_id, department, section, purpose, total,
    printed_name, designation, current_stage, pr_date, sai_no, alobs_no
  )
  VALUES (
    p_request->>'pr_no',
    (p_request->>'user_id')::uuid,
    p_request->>'department',
    NULLIF(p_request->>'section', ''),
    p_request->>'purpose',
    v_total,
    p_request->>'printed_name',
    NULLIF(p_request->>'designation', ''),
    'draft',
    (p_request->>'pr_date')::date,
    NULL,
    NULL
  )
  RETURNING * INTO v_pr;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS x(
      item_description text,
      quantity integer,
      unit text,
      unit_cost numeric,
      total_cost numeric
    )
  LOOP
    IF v_item.item_description IS NULL OR btrim(v_item.item_description) = ''
       OR v_item.quantity IS NULL OR v_item.quantity < 1
       OR v_item.unit_cost IS NULL OR v_item.unit_cost < 0 THEN
      RAISE EXCEPTION 'A Purchase Request item contains invalid values.';
    END IF;

    INSERT INTO public.pr_items (
      pr_no, item_description, quantity, unit, unit_cost, total_cost
    )
    VALUES (
      v_pr.pr_no,
      btrim(v_item.item_description),
      v_item.quantity,
      COALESCE(NULLIF(btrim(v_item.unit), ''), 'pcs'),
      v_item.unit_cost,
      v_item.quantity::numeric * v_item.unit_cost
    );
  END LOOP;

  -- Existing draft trigger normally creates this record. Keep a fallback.
  IF NOT EXISTS (
    SELECT 1 FROM public.pr_stages_completed
    WHERE pr_no = v_pr.pr_no AND stage_key = 'draft'
  ) THEN
    INSERT INTO public.pr_stages_completed (
      pr_no, stage_key, stage_name, status, completed_at, remarks, notes
    )
    VALUES (
      v_pr.pr_no, 'draft', 'Draft', 'completed', now(),
      'Purchase Request drafted by end-user unit. Pending physical submission of printed form to the Procurement Office.',
      'Temporary PR Number assigned pending physical submission.'
    );
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.pr_items AS i
  WHERE i.pr_no = v_pr.pr_no;

  RETURN jsonb_build_object('pr', to_jsonb(v_pr), 'items', v_items);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_purchase_request_with_items(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase_request_with_items(jsonb, jsonb)
  TO service_role;

-- The PR-item and stage-history foreign keys already use ON UPDATE CASCADE.
-- This function updates the PR and related records within a single transaction.
CREATE OR REPLACE FUNCTION public.process_purchase_request_action(
  p_pr_no text,
  p_action text,
  p_new_stage text DEFAULT NULL,
  p_remarks text DEFAULT NULL,
  p_official_pr_no text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pr public.purchase_requests%ROWTYPE;
  v_old_pr_no text := p_pr_no;
  v_remarks text := btrim(COALESCE(p_remarks, ''));
  v_official_pr_no text := upper(btrim(COALESCE(p_official_pr_no, '')));
  v_now timestamptz := now();
  v_stage_keys text[] := ARRAY[
    'draft', 'receipt_of_pr', 'ppmp_app_verification', 'pmo_director_validation',
    'pr_pre_numbering', 'budget_endorsement', 'approved_pr_received', 'rfq_generation',
    'rfq_evaluation', 'rfq_printing', 'philgeps_posting', 'aoq_preparation',
    'aoq_evaluation', 'awarded_aoq_received', 'po_generation_evaluation',
    'pmo_director_po_validation', 'budget_po_endorsement', 'approved_po_received',
    'po_release_supplier', 'spmo_endorsement', 'monitoring_documentation'
  ];
  v_current_index integer;
  v_new_index integer;
  v_is_final_completion boolean := false;
  v_stage_label text;
  v_history jsonb;
BEGIN
  IF p_pr_no IS NULL OR btrim(p_pr_no) = '' THEN
    RAISE EXCEPTION 'Purchase Request number is required.';
  END IF;

  SELECT * INTO v_pr
  FROM public.purchase_requests
  WHERE pr_no = p_pr_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase Request not found.';
  END IF;
  IF v_pr.current_stage IN ('completed', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'This Purchase Request is already in a terminal status.';
  END IF;

  IF p_action = 'remark' THEN
    IF v_remarks = '' THEN
      RAISE EXCEPTION 'A remark is required for this action.';
    END IF;

    v_stage_label := CASE v_pr.current_stage
      WHEN 'draft' THEN 'Draft'
      WHEN 'receipt_of_pr' THEN 'Receipt of Purchase Request (PR)'
      WHEN 'ppmp_app_verification' THEN 'Verification Against PPMP/APP'
      WHEN 'pmo_director_validation' THEN 'Validation by the PMO Director'
      WHEN 'pr_pre_numbering' THEN 'Pre-Numbering and Control of PRs'
      WHEN 'budget_endorsement' THEN 'Endorsement to Budget Management Office'
      WHEN 'approved_pr_received' THEN 'Receipt of Approved PRs'
      WHEN 'rfq_generation' THEN 'Generation of Requests for Quotations (RFQs)'
      WHEN 'rfq_evaluation' THEN 'Evaluation of Generated RFQs'
      WHEN 'rfq_printing' THEN 'Printing of RFQs / SVPs'
      WHEN 'philgeps_posting' THEN 'Posting to PhilGEPS'
      WHEN 'aoq_preparation' THEN 'Preparation of Abstract of Quotations (AOQ)'
      WHEN 'aoq_evaluation' THEN 'Evaluation of AOQs'
      WHEN 'awarded_aoq_received' THEN 'Receipt of Awarded AOQs'
      WHEN 'po_generation_evaluation' THEN 'Generation and Evaluation of Purchase Orders'
      WHEN 'pmo_director_po_validation' THEN 'Validation and Signature by PMO Director'
      WHEN 'budget_po_endorsement' THEN 'Forwarding to Budget Office'
      WHEN 'approved_po_received' THEN 'Receipt of Approved Purchase Orders'
      WHEN 'po_release_supplier' THEN 'Release of Purchase Orders to Supplier'
      WHEN 'spmo_endorsement' THEN 'Endorsement of POs to the SPMO'
      WHEN 'monitoring_documentation' THEN 'Monitoring and Documentation'
      ELSE v_pr.current_stage
    END;

    INSERT INTO public.pr_stages_completed (
      pr_no, stage_name, stage_key, status, completed_at, remarks
    )
    VALUES (v_pr.pr_no, v_stage_label || ' — Remark', v_pr.current_stage, 'remark', v_now, v_remarks);

    UPDATE public.purchase_requests
    SET updated_at = v_now
    WHERE pr_no = v_pr.pr_no
    RETURNING * INTO v_pr;

  ELSIF p_action = 'reject' THEN
    IF v_remarks = '' THEN
      RAISE EXCEPTION 'A remark is required for this action.';
    END IF;

    UPDATE public.purchase_requests
    SET current_stage = 'rejected', current_status = 'rejected', updated_at = v_now
    WHERE pr_no = v_pr.pr_no
    RETURNING * INTO v_pr;

    INSERT INTO public.pr_stages_completed (
      pr_no, stage_name, stage_key, status, completed_at, remarks
    )
    VALUES (v_pr.pr_no, 'PR Rejected', 'rejected', 'rejected', v_now, v_remarks);

  ELSIF p_action = 'assign_number' OR p_action = 'complete' THEN
    IF p_action = 'assign_number' OR v_official_pr_no <> '' THEN
      IF v_pr.current_stage <> 'pr_pre_numbering' THEN
        RAISE EXCEPTION 'An official PR number may only be assigned during Pre-Numbering and Control of PRs.';
      END IF;
      IF position('TEMP' IN upper(v_pr.pr_no)) = 0 THEN
        RAISE EXCEPTION 'This Purchase Request already has an official PR number.';
      END IF;
      IF v_official_pr_no = '' THEN
        RAISE EXCEPTION 'Official PR number is required.';
      END IF;
      IF v_official_pr_no !~ '^PR-[A-Z0-9-]{3,40}$'
         OR position('TEMP' IN v_official_pr_no) > 0 THEN
        RAISE EXCEPTION 'Invalid official PR number.';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.purchase_requests
        WHERE pr_no = v_official_pr_no AND pr_no <> v_pr.pr_no
      ) THEN
        RAISE EXCEPTION 'Official PR number is already assigned to another request.';
      END IF;

      UPDATE public.purchase_requests
      SET pr_no = v_official_pr_no, updated_at = v_now
      WHERE pr_no = v_pr.pr_no
      RETURNING * INTO v_pr;

      INSERT INTO public.pr_stages_completed (
        pr_no, stage_name, stage_key, status, completed_at, remarks
      )
      VALUES (
        v_pr.pr_no,
        'Pre-Numbering and Control of PRs — Control Number Assigned',
        'pr_pre_numbering',
        'completed',
        v_now,
        'Official PR Control Number assigned: ' || v_pr.pr_no ||
          ' (previously ' || v_old_pr_no || ').' ||
          CASE WHEN v_remarks <> '' THEN ' Note: ' || v_remarks ELSE '' END
      );
    END IF;

    IF p_action = 'complete' THEN
      IF p_new_stage IS NULL OR btrim(p_new_stage) = '' THEN
        RAISE EXCEPTION 'A valid next procurement stage is required.';
      END IF;

      v_current_index := array_position(v_stage_keys, v_pr.current_stage);
      v_new_index := array_position(v_stage_keys, p_new_stage);
      v_is_final_completion := v_pr.current_stage = 'monitoring_documentation' AND p_new_stage = 'completed';

      IF v_current_index IS NULL OR (
        NOT v_is_final_completion AND
        NOT (v_pr.current_stage = 'draft' AND p_new_stage = 'receipt_of_pr') AND
        (v_new_index IS NULL OR v_new_index <> v_current_index + 1)
      ) THEN
        RAISE EXCEPTION 'Invalid stage transition. The PR must follow the official procurement workflow sequence.';
      END IF;

      IF v_pr.current_stage = 'pr_pre_numbering'
         AND position('TEMP' IN upper(v_pr.pr_no)) > 0 THEN
        RAISE EXCEPTION 'Official PR number is required to complete Pre-Numbering and Control of PRs.';
      END IF;

      UPDATE public.purchase_requests
      SET current_stage = p_new_stage, current_status = p_new_stage, updated_at = v_now
      WHERE pr_no = v_pr.pr_no
      RETURNING * INTO v_pr;

      v_stage_label := CASE p_new_stage
        WHEN 'completed' THEN 'Completed'
        WHEN 'receipt_of_pr' THEN 'Receipt of Purchase Request (PR)'
        WHEN 'ppmp_app_verification' THEN 'Verification Against PPMP/APP'
        WHEN 'pmo_director_validation' THEN 'Validation by the PMO Director'
        WHEN 'pr_pre_numbering' THEN 'Pre-Numbering and Control of PRs'
        WHEN 'budget_endorsement' THEN 'Endorsement to Budget Management Office'
        WHEN 'approved_pr_received' THEN 'Receipt of Approved PRs'
        WHEN 'rfq_generation' THEN 'Generation of Requests for Quotations (RFQs)'
        WHEN 'rfq_evaluation' THEN 'Evaluation of Generated RFQs'
        WHEN 'rfq_printing' THEN 'Printing of RFQs / SVPs'
        WHEN 'philgeps_posting' THEN 'Posting to PhilGEPS'
        WHEN 'aoq_preparation' THEN 'Preparation of Abstract of Quotations (AOQ)'
        WHEN 'aoq_evaluation' THEN 'Evaluation of AOQs'
        WHEN 'awarded_aoq_received' THEN 'Receipt of Awarded AOQs'
        WHEN 'po_generation_evaluation' THEN 'Generation and Evaluation of Purchase Orders'
        WHEN 'pmo_director_po_validation' THEN 'Validation and Signature by PMO Director'
        WHEN 'budget_po_endorsement' THEN 'Forwarding to Budget Office'
        WHEN 'approved_po_received' THEN 'Receipt of Approved Purchase Orders'
        WHEN 'po_release_supplier' THEN 'Release of Purchase Orders to Supplier'
        WHEN 'spmo_endorsement' THEN 'Endorsement of POs to the SPMO'
        WHEN 'monitoring_documentation' THEN 'Monitoring and Documentation'
        ELSE p_new_stage
      END;

      INSERT INTO public.pr_stages_completed (
        pr_no, stage_name, stage_key, status, completed_at, remarks
      )
      VALUES (
        v_pr.pr_no, v_stage_label, p_new_stage, 'completed', v_now,
        CASE
          WHEN v_remarks <> '' THEN v_remarks
          WHEN v_old_pr_no <> v_pr.pr_no THEN
            'Official PR Control Number assigned: ' || v_pr.pr_no || ' (previously ' || v_old_pr_no || ').'
          ELSE 'No remarks provided.'
        END
      );
    END IF;

  ELSE
    RAISE EXCEPTION 'Unsupported Purchase Request action.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(h) ORDER BY h.completed_at, h.created_at),
    '[]'::jsonb
  )
  INTO v_history
  FROM (
    SELECT stage_name, stage_key, completed_at, remarks, status, created_at
    FROM public.pr_stages_completed
    WHERE pr_no = v_pr.pr_no
  ) AS h;

  RETURN jsonb_build_object(
    'updatedPR', to_jsonb(v_pr),
    'stageHistory', v_history,
    'action', p_action,
    'newStatus', CASE
      WHEN p_action = 'complete' THEN p_new_stage
      WHEN p_action = 'reject' THEN 'rejected'
      ELSE NULL
    END,
    'officialPrNo', CASE WHEN v_pr.pr_no <> v_old_pr_no THEN v_pr.pr_no ELSE NULL END,
    'oldPrNo', CASE WHEN v_pr.pr_no <> v_old_pr_no THEN v_old_pr_no ELSE NULL END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.process_purchase_request_action(text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_purchase_request_action(text, text, text, text, text)
  TO service_role;
