UPDATE public.pr_stages_completed
SET stage_name = CASE stage_key
  WHEN 'approved_po_received' THEN 'Receipt of Approved Purchase Orders — Remark'
  WHEN 'awarded_aoq_received' THEN 'Receipt of Awarded AOQs — Remark'
  WHEN 'receipt_of_pr' THEN 'Receipt of Purchase Request (PR) — Remark'
  ELSE stage_name || ' — Remark'
END
WHERE status = 'remark'
  AND stage_name NOT LIKE '%— Remark';

UPDATE public.notifications
SET message = replace(message, 'PO Issued — Remark', 'Receipt of Approved Purchase Orders — Remark')
WHERE message LIKE '%PO Issued — Remark%';
