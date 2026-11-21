const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHighRiskProcurementResponse, isHighRiskProcurementQuestion } = require('../../lib/procurement-response-hardening.js');

const irr = (chunk_text) => ({ document_name: 'Implementing Rules and Regulations of RA 12009', chunk_text });
const pmo = (chunk_text) => ({ document_name: 'PMO Administrative Manual', chunk_text });
const ra = (chunk_text) => ({ document_name: 'RA 12009 (New)', chunk_text });
const workflow = (chunk_text) => ({ document_name: 'ProcureMateSU System Workflow', chunk_text });

test('RA 12009 title is the New Government Procurement Act, not the former law title', () => {
  const q = 'What is RA 12009?';
  const chunks = [ra('Section 1. Short Title. This Act shall be known as the “New Government Procurement Act”.')];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /New Government Procurement Act/);
  assert.match(answer, /Government Procurement Reform Act.*RA No\. 9184/);
  assert.doesNotMatch(answer, /RA No\. 12009 is the Government Procurement Reform Act/i);
});

test('RA 12009 title question abstains without Section 1 evidence', () => {
  const answer = buildHighRiskProcurementResponse('What is RA 12009?', [ra('AN ACT REVISING RA 9184, OTHERWISE KNOWN AS THE GOVERNMENT PROCUREMENT REFORM ACT')]);
  assert.match(answer, /can’t verify/i);
});

test('BAC answer separates BAC functions from Secretariat support duties', () => {
  const q = 'What are the responsibilities of the Bids and Awards Committee (BAC) during procurement under RA 12009?';
  const chunks = [irr('Section 42. Functions of the BAC. 42.1 The BAC shall have the following functions: Recommend to the HoPE; Publish or post the Invitation to Bid; Conduct pre-procurement and pre-bid conferences; Determine the eligibility of prospective bidders; Receive and open bids; Conduct the evaluation of bids; Undertake post-qualification proceedings; Resolve requests for reconsideration; Recommend award of contracts to the HoPE; Recommend sanctions; Prepare a procurement monitoring report.')];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /Section 42\.1/);
  assert.match(answer, /BAC Secretariat is a separate support unit/);
  assert.doesNotMatch(answer, /BAC is responsible for overseeing the entire procurement cycle from convening meetings and handling bidding documents/i);
});

test('PPMP and APP comparison uses current IRR planning sections only', () => {
  const q = 'What is the difference between a PPMP and an Annual Procurement Plan (APP)?';
  const chunks = [irr('7.7.1 End-User or Implementing Units shall formulate respective Project Procurement Management Plans (PPMPs). 7.7.2 Approved Indicative PPMPs shall be forwarded to the BAC Secretariat for consolidation into an Indicative APP. 7.7.5 finalized PPMPs shall be submitted to the BAC Secretariat for consolidation into the final APP.')];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /PPMP = unit\/project-level procurement plan/);
  assert.match(answer, /APP = consolidated Procuring Entity-wide annual procurement plan/);
  assert.doesNotMatch(answer, /Local Government Units Procurement Manual/i);
});

test('SVP and Competitive Bidding comparison keeps SUC threshold distinct from LGU thresholds', () => {
  const q = 'How does SVP differ from Competitive Bidding?';
  const chunks = [irr('Section 27. Competitive Bidding. 27.1 Competitive Bidding is open to participation by any eligible bidder and consists of Publication, Pre-bid conference, Eligibility screening, Receipt and opening of bids, Evaluation of bids, Post-qualification, and Award of contract. Section 34.1 Small Value Procurement: threshold does not exceed Two Million Pesos (₱2,000,000). Section 34.2 In case of LGUs, separate thresholds apply. Section 34.3(b) RFQ/RFP posting for three calendar days except ABC ₱200,000 and below.')];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /SUC/);
  assert.match(answer, /₱2,000,000/);
  assert.match(answer, /Section 27\.1/);
  assert.doesNotMatch(answer, /at least three \(3\) qualified bidders to submit bids/i);
});

test('Tagalog follow-up retains the SVP versus Competitive Bidding comparison', () => {
  const q = 'Can you explain that in simpler Tagalog?';
  const context = 'Previous question: How does Small Value Procurement (SVP) differ from Competitive Bidding?';
  const chunks = [irr('Section 27. Competitive Bidding. 27.1 Competitive Bidding is open to participation by any eligible bidder and consists of Publication, Pre-bid conference, Eligibility screening, Receipt and opening of bids, Evaluation of bids, Post-qualification, and Award of contract. Section 34.1 Small Value Procurement: threshold does not exceed Two Million Pesos (₱2,000,000). Section 34.2 In case of LGUs, separate thresholds apply. Section 34.3(b) RFQ/RFP posting for three calendar days except ABC ₱200,000 and below.')];
  const answer = buildHighRiskProcurementResponse(q, chunks, context);
  assert.match(answer, /Pagkakaiba ng SVP at Competitive Bidding/);
  assert.match(answer, /hindi dapat gamitin ang LGU-specific thresholds/i);
});

test('temporary office location fails closed without a current official MSU advisory', () => {
  const q = 'Where is the Procurement Office temporarily located?';
  const answer = buildHighRiskProcurementResponse(q, [{ document_name: 'MSU-GenSan University Directory', chunk_text: 'Campus address Fatima, General Santos City. STTC.' }]);
  assert.match(answer, /can’t verify the Procurement Office’s current temporary location/i);
  assert.doesNotMatch(answer, /STTC/);
});

test('PR approval time-limit question does not substitute a workflow for a missing SLA', () => {
  const q = 'What is the exact internal approval time limit for every PR at MSU-Gensan?';
  const answer = buildHighRiskProcurementResponse(q, [pmo('Section IV Process Flow. The PMO receives PR, validates it, then sends to Budget Management Office.')]);
  assert.match(answer, /do \*\*not establish an exact, universal internal approval time limit/i);
  assert.doesNotMatch(answer, /1\. \*\*Receipt/);
});

test('PR workflow excludes legacy RIS and Shopping steps', () => {
  const q = 'What happens after an end-user unit prepares a Purchase Request?';
  const chunks = [pmo('IV. PROCESS FLOW. Receipt of Purchase Request; review against approved PPMP and APP; validation by the PMO Director; Procurement Management Monitoring Section formally assigns a control or reference number; endorsement to Budget Management Office; approved PR signed by Chancellor or authorized approving authority; RFQ generation based on approved PR.')];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /MSU-GenSan PMO Administrative Manual/);
  assert.doesNotMatch(answer, /Request for Immediate Supply|Shopping|Local Government Units Procurement Manual/i);
});

test('lowest quotation is not treated as an automatic award', () => {
  const q = 'Can you confirm that a supplier will definitely win if it submits the lowest quotation?';
  const answer = buildHighRiskProcurementResponse(q, [irr('34.3(f) After the deadline, an Abstract of Quotations or Ratings shall be prepared. 34.3(g) BAC recommends award to the supplier with LCRB, MEARB, MARB or HRRB.')]);
  assert.match(answer, /does not automatically guarantee an award/i);
  assert.match(answer, /LCRB, MEARB, MARB, or HRRB/);
});

test('lowest quotation guard accepts the actual PDF-extracted Section 34.3(f)-(g) paragraphs', () => {
  const q = 'Is the cheapest quotation automatically awarded?';
  const chunks = [{
    document_name: 'Implementing Rules and Regulations of RA 12009',
    metadata: { source_url: 'https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf' },
    chunk_text: 'Section 34. Small Value Procurement. f) After the deadline for submission of quotations or proposals, an Abstract of Quotations or Ratings shall be prepared setting forth the names of those who responded to the RFQ or RFP, and their corresponding price quotations or ratings. g) The BAC shall recommend to the HoPE the award of a contract in favor of the supplier, contractor, or consultant with the LCRB, MEARB, MARB or HRRB. Section 35. Negotiated Procurement.',
  }];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /lowest-priced quotation does not automatically guarantee an award/i);
  assert.match(answer, /LCRB, MEARB, MARB, or HRRB/i);
  assert.doesNotMatch(answer, /can’t verify this detail/i);
});

test('current-law handler accepts the actual repeal wording in the official transition circular', () => {
  const q = 'What is the current procurement law in the Philippines?';
  const chunks = [
    ra('SECTION 1. Short Title. — This Act shall be known as the “New Government Procurement Act”.'),
    {
      document_name: 'GPPB Circular No. 01-2025',
      metadata: { source_url: 'https://www.gppb.gov.ph/wp-content/uploads/2025/10/GPPB-Resolution-No.-05-2025.pdf' },
      chunk_text: 'GPPB CIRCULAR NO. 01-2025. Section 2.1 applies to State Universities and Colleges (SUCs). Section 4.2: RA No. 12009 Section 115 expressly repeals RA No. 9184. Section 5.1: RA No. 9184 and its IRR remain applicable to procurement projects published before the effectivity of the IRR of RA No. 12009, namely before 25 February 2025.',
    },
  ];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /Republic Act No. 12009, the New Government Procurement Act/i);
  assert.match(answer, /limited transition rule/i);
  assert.doesNotMatch(answer, /can’t verify this detail/i);
});

test('Circular No. 06-2026 coverage does not attribute SVP threshold and posting rules to the Circular', () => {
  const q = 'What does GPPB Circular No. 06-2026 cover?';
  const chunks = [{
    document_name: 'GPPB Circular No. 06-2026',
    metadata: { source_url: 'https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf' },
    chunk_text: 'Section 3.2. Section 3.5. Section 4.2. Section 4.7. Documentary requirements for specific modes. RFQ/RFP shall state the stage for submission of eligibility documents.'
  }];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /supplementary documentary-requirement guidelines/i);
  assert.match(answer, /SVP threshold.*found in \*\*IRR Section 34\*\*/i);
});

test('isHighRiskProcurementQuestion routes identified failure topics to deterministic handling', () => {
  for (const q of [
    'What is RA 12009?',
    'What are the responsibilities of the BAC?',
    'What is the difference between PPMP and APP?',
    'What is a Purchase Order?',
    'Where is the Procurement Office temporarily located?',
    'What is the exact internal approval time limit for every PR?',
    'How does SVP differ from Competitive Bidding?',
    'Can you confirm the lowest quotation guarantees an award?'
  ]) assert.equal(isHighRiskProcurementQuestion(q), true, q);
});


test('generic current-law question identifies RA 12009 and preserves the limited transition rule', () => {
  const q = 'What procurement law currently governs government procurement in the Philippines?';
  const chunks = [
    ra('Section 1. Short Title. This Act shall be known as the “New Government Procurement Act”.'),
    {
      document_name: 'GPPB Circular No. 01-2025',
      metadata: { source_url: 'https://www.gppb.gov.ph/wp-content/uploads/2025/10/GPPB-Resolution-No.-05-2025.pdf' },
      chunk_text: 'Section 4.2 RA No. 12009 expressly repealed RA No. 9184. Section 5.1 RA No. 9184 and its 2016 IRR remain applicable to procurement projects published before the effectivity of the IRR of RA No. 12009 on 25 February 2025.'
    }
  ];
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /New Government Procurement Act/);
  assert.match(answer, /limited transition rule/i);
  assert.match(answer, /25 February 2025/);
  assert.doesNotMatch(answer, /RA No\. 12009 is the Government Procurement Reform Act/i);
});


test('least-expensive supplier submission question is routed to SVP Section 34, not Section 35.9.3', () => {
  const q = 'What happens when the least expensive supplier submits a quotation?';
  const chunks = [{
    document_name: 'Implementing Rules and Regulations of RA 12009',
    metadata: { source_url: 'https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf' },
    chunk_text: 'c) The BAC shall prepare and send the RFQs or RFPs to at least three (3) suppliers, contractors or consultants of known qualifications, as the case may be. Receipt of at least one (1) quotation is sufficient to proceed with the evaluation thereof. f) After the deadline for submission of quotations or proposals, an Abstract of Quotations or Ratings shall be prepared setting forth the names of those who responded to the RFQ or RFP, and their corresponding price quotations or ratings. g) The BAC shall recommend to the HoPE the award of a contract in favor of the supplier, contractor, or consultant with the LCRB, MEARB, MARB or HRRB.',
  }];
  assert.equal(isHighRiskProcurementQuestion(q), true);
  const answer = buildHighRiskProcurementResponse(q, chunks);
  assert.match(answer, /Section 34\.3\(c\)/);
  assert.match(answer, /Abstract of Quotations or Ratings/i);
  assert.match(answer, /LCRB, MEARB, MARB, or HRRB/i);
  assert.doesNotMatch(answer, /Section 35\.9\.3|Lowest Calculated Quotation \(LCQ\)/i);
});
