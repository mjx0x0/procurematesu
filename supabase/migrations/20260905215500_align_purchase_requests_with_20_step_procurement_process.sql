-- Align existing PR records with the official 20-step PMO procurement workflow.
UPDATE public.purchase_requests
SET current_stage = CASE current_stage
  WHEN 'pending' THEN 'receipt_of_pr'
  WHEN 'budget_office' THEN 'budget_endorsement'
  WHEN 'chancellor_approval' THEN 'approved_pr_received'
  WHEN 'procurement_processing' THEN 'rfq_generation'
  WHEN 'canvassing' THEN 'aoq_preparation'
  WHEN 'for_award' THEN 'awarded_aoq_received'
  WHEN 'po_issued' THEN 'approved_po_received'
  ELSE current_stage
END,
current_status = CASE current_stage
  WHEN 'pending' THEN 'receipt_of_pr'
  WHEN 'budget_office' THEN 'budget_endorsement'
  WHEN 'chancellor_approval' THEN 'approved_pr_received'
  WHEN 'procurement_processing' THEN 'rfq_generation'
  WHEN 'canvassing' THEN 'aoq_preparation'
  WHEN 'for_award' THEN 'awarded_aoq_received'
  WHEN 'po_issued' THEN 'approved_po_received'
  ELSE current_status
END
WHERE current_stage IN ('pending','budget_office','chancellor_approval','procurement_processing','canvassing','for_award','po_issued');

UPDATE public.pr_stages_completed
SET stage_key = CASE stage_key
  WHEN 'pending' THEN 'receipt_of_pr'
  WHEN 'budget_office' THEN 'budget_endorsement'
  WHEN 'chancellor_approval' THEN 'approved_pr_received'
  WHEN 'procurement_processing' THEN 'rfq_generation'
  WHEN 'canvassing' THEN 'aoq_preparation'
  WHEN 'for_award' THEN 'awarded_aoq_received'
  WHEN 'po_issued' THEN 'approved_po_received'
  ELSE stage_key
END
WHERE stage_key IN ('pending','budget_office','chancellor_approval','procurement_processing','canvassing','for_award','po_issued');

UPDATE public.pr_stages_completed
SET stage_name = CASE stage_key
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
  ELSE stage_name
END
WHERE stage_key IN ('receipt_of_pr','ppmp_app_verification','pmo_director_validation','pr_pre_numbering','budget_endorsement','approved_pr_received','rfq_generation','rfq_evaluation','rfq_printing','philgeps_posting','aoq_preparation','aoq_evaluation','awarded_aoq_received','po_generation_evaluation','pmo_director_po_validation','budget_po_endorsement','approved_po_received','po_release_supplier','spmo_endorsement','monitoring_documentation');

CREATE OR REPLACE FUNCTION public.initialize_procurement_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.current_stage IS NULL OR NEW.current_stage = 'draft' THEN NEW.current_stage := 'receipt_of_pr'; END IF;
  IF NEW.current_status IS NULL OR NEW.current_status = 'draft' THEN NEW.current_status := 'receipt_of_pr'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_initialize_procurement_workflow ON public.purchase_requests;
CREATE TRIGGER trg_initialize_procurement_workflow BEFORE INSERT ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.initialize_procurement_workflow();

CREATE OR REPLACE FUNCTION public.record_initial_procurement_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.current_stage = 'receipt_of_pr' THEN
    INSERT INTO public.pr_stages_completed (pr_no, stage_key, stage_name, status, completed_at, remarks)
    VALUES (NEW.pr_no, 'receipt_of_pr', 'Receipt of Purchase Request (PR)', 'completed', COALESCE(NEW.created_at, now()), 'Purchase Request received from the end-user unit.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_initial_procurement_stage ON public.purchase_requests;
CREATE TRIGGER trg_record_initial_procurement_stage AFTER INSERT ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.record_initial_procurement_stage();
