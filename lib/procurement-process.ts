export const PROCUREMENT_STAGES = [
  { key: 'receipt_of_pr', number: 1, label: 'Receipt of Purchase Request (PR)', shortLabel: 'Receipt of PR', description: 'Receive duly accomplished Purchase Requests (PRs) from end-user units.' },
  { key: 'ppmp_app_verification', number: 2, label: 'Verification Against PPMP/APP', shortLabel: 'PPMP/APP Verification', description: 'Review and verify the PR against the approved PPMP and APP.' },
  { key: 'pmo_director_validation', number: 3, label: 'Validation by the PMO Director', shortLabel: 'PMO Director Validation', description: 'Forward the PR for review, validation, and signature of the PMO Director to certify completeness and compliance.' },
  { key: 'pr_pre_numbering', number: 4, label: 'Pre-Numbering and Control of PRs', shortLabel: 'PR Pre-Numbering & Control', description: 'Assign control numbers to validated PRs and record them in the procurement tracking log.' },
  { key: 'budget_endorsement', number: 5, label: 'Endorsement to Budget Management Office', shortLabel: 'Budget Office Endorsement', description: 'Endorse controlled PRs to the Budget Management Office for fund availability and obligation clearance.' },
  { key: 'approved_pr_received', number: 6, label: 'Receipt of Approved PRs', shortLabel: 'Approved PR Received', description: 'Receive approved Purchase Requests signed by the Chancellor or authorized approving authority.' },
  { key: 'rfq_generation', number: 7, label: 'Generation of Requests for Quotations (RFQs)', shortLabel: 'RFQ Generation', description: 'Generate RFQs based on approved PRs, including complete technical specifications and approved ABC.' },
  { key: 'rfq_evaluation', number: 8, label: 'Evaluation of Generated RFQs', shortLabel: 'RFQ Evaluation', description: 'Review RFQs for accuracy, completeness, and consistency with the approved PRs.' },
  { key: 'rfq_printing', number: 9, label: 'Printing of RFQs / SVPs', shortLabel: 'RFQ/SVP Printing', description: 'Print three (3) or four (4) copies of RFQs or Small Value Procurement (SVP) documents, as required.' },
  { key: 'philgeps_posting', number: 10, label: 'Posting to PhilGEPS', shortLabel: 'PhilGEPS Posting', description: 'Post RFQs and SVPs to PhilGEPS when the ABC meets the applicable threshold: ₱50,000 and above for RFQs and ₱200,000 and above for SVP.' },
  { key: 'aoq_preparation', number: 11, label: 'Preparation of Abstract of Quotations (AOQ)', shortLabel: 'AOQ Preparation', description: 'Receive supplier quotations and summarize all valid offers through preparation of an AOQ.' },
  { key: 'aoq_evaluation', number: 12, label: 'Evaluation of AOQs', shortLabel: 'AOQ Evaluation', description: 'Evaluate AOQs for price reasonableness, compliance with technical specifications, and procurement rules.' },
  { key: 'awarded_aoq_received', number: 13, label: 'Receipt of Awarded AOQs', shortLabel: 'Awarded AOQ Received', description: 'Receive duly awarded and signed AOQs for preparation of Purchase Orders (POs). For ABC above ₱50,000, use the BAC format and required PMO/end-user/BAC signatories; for ABC below ₱50,000, use the specified PMO staff, end-user, BAC TWG, and PMO Director signatories.' },
  { key: 'po_generation_evaluation', number: 14, label: 'Generation and Evaluation of Purchase Orders', shortLabel: 'PO Generation & Evaluation', description: 'Generate POs and review them for correctness, completeness, and consistency with approved AOQs.' },
  { key: 'pmo_director_po_validation', number: 15, label: 'Validation and Signature by PMO Director', shortLabel: 'PMO Director PO Validation', description: 'Submit generated POs for validation and signature of the PMO Director.' },
  { key: 'budget_po_endorsement', number: 16, label: 'Forwarding to Budget Office', shortLabel: 'Budget Office PO Endorsement', description: 'Forward validated POs to the Budget Management Office for obligation and certification.' },
  { key: 'approved_po_received', number: 17, label: 'Receipt of Approved Purchase Orders', shortLabel: 'Approved PO Received', description: 'Receive approved and obligated Purchase Orders.' },
  { key: 'po_release_supplier', number: 18, label: 'Release of Purchase Orders to Supplier', shortLabel: 'PO Release to Supplier', description: 'Deliver approved Purchase Orders to the winning bidder or supplier.' },
  { key: 'spmo_endorsement', number: 19, label: 'Endorsement of POs to the SPMO', shortLabel: 'SPMO Endorsement', description: 'Endorse the POs together with all complete supporting attachments to the SPMO for further processing.' },
  { key: 'monitoring_documentation', number: 20, label: 'Monitoring and Documentation', shortLabel: 'Monitoring & Documentation', description: 'Monitor procurement transactions and maintain complete documentation for tracking, reporting, and audit purposes.' },
] as const;

export type ProcurementStageKey = (typeof PROCUREMENT_STAGES)[number]['key'];

export const PROCUREMENT_STAGE_KEYS = PROCUREMENT_STAGES.map((stage) => stage.key) as ProcurementStageKey[];

export const PROCUREMENT_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  PROCUREMENT_STAGES.map((stage) => [stage.key, stage.label])
);

export const PROCUREMENT_STAGE_SHORT_LABELS: Record<string, string> = Object.fromEntries(
  PROCUREMENT_STAGES.map((stage) => [stage.key, stage.shortLabel])
);

export const TERMINAL_STAGES = ['completed', 'rejected', 'cancelled'] as const;

export function getProcurementStage(key: string) {
  return PROCUREMENT_STAGES.find((stage) => stage.key === key);
}
