'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVerifiedProcurementAnswer } = require('../../lib/procurement-answer-guards.js');

const IRR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf';
const IRR_ADVISORY_URL = 'https://www.gppb.gov.ph/public-advisory-no-09-2026/';
const FORMS_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2025/07/GPPB-Resolution-No.-03-2025.pdf';
const FORMS_ADVISORY_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2025/09/Capacity-Development-Advisory-2025-003.pdf';
const TREE_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2026/01/GPPB-Resolution-No.-12-2025.pdf';
const SVP_CIRCULAR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf';
const RATE_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2026/07/Annex-A_Circular-Bid-Docs-Fees_15052026.pdf';
const BSKE_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2026/09/Annex-A_Guidelines-on-Conduct-of-Procurement-Activities-BSKE_25082026.pdf';

const irrVersionQuery = 'Which version of the Implementing Rules and Regulations of RA No. 12009 should MSU-General Santos use? Explain the status of the March 2026 edition and cite the official GPPB advisory and approved IRR.';
const irrVersionChunks = [
  {
    document_name: 'GPPB Public Advisory No. 09-2026',
    document_type: 'gppb_public_advisory',
    chunk_text: 'Posted 31 July 2026. The Implementing Rules and Regulations of Republic Act No. 12009 (1st Edition, as of 31 March 2026) has been withdrawn and should no longer be used as a reference. All concerned must use and cite only the IRR approved by the GPPB through Resolution No. 02-2025 dated 04 February 2025, published in the Official Gazette on 10 February 2025, effective 25 February 2025.',
    metadata: { source_url: IRR_ADVISORY_URL },
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    document_type: 'irr',
    chunk_text: 'The current GPPB-approved Implementing Rules and Regulations of RA No. 12009 was approved by Resolution No. 02-2025 and took effect on 25 February 2025.',
    metadata: { source_url: IRR_URL, document_status: 'current_gppb_approved_irr_ra_12009' },
  },
];

test('IRR edition answer cites both withdrawal notice and approved IRR', () => {
  const answer = buildVerifiedProcurementAnswer(irrVersionQuery, irrVersionChunks);
  assert.match(answer, /withdrawn and should no longer be used/i);
  assert.ok(answer.includes(IRR_ADVISORY_URL));
  assert.ok(answer.includes(IRR_URL));
  assert.match(answer, /Resolution No\. 02-2025/);
  assert.doesNotMatch(answer, /Circular No\. 01-2025.*withdrawal/i);
});

test('IRR edition answer still gives both source links when one evidence chunk is missing', () => {
  const answer = buildVerifiedProcurementAnswer(irrVersionQuery, [irrVersionChunks[0]]);
  assert.match(answer, /could not verify both/i);
  assert.ok(answer.includes(IRR_ADVISORY_URL));
  assert.ok(answer.includes(IRR_URL));
});

const formsQuery = 'When did the new Standard Procurement Forms become mandatory, and what GPPB resolution approved them? Cite the official source.';
const formsChunks = [{
  document_name: 'GPPB Resolution No. 03-2025',
  document_type: 'gppb_resolution',
  chunk_text: 'GPPB Resolution No. 03-2025 approves the Standard Forms for Procurement in accordance with RA No. 12009 and its IRR. Approval date: 14 May 2025. Publication date: 23 June 2025. The Standard Procurement Forms became effective and mandatory on 21 September 2025, ninety (90) days after publication, according to GPPB Capacity Development Advisory No. 2025-003. The forms include the Market Scoping Form, Project Procurement Management Plan (PPMP), Annual Procurement Plan (APP), Philippine Bidding Documents for Goods, Infrastructure Projects and Consulting Services, and PBD-related forms.',
  metadata: { source_url: FORMS_URL, document_status: 'current_standard_forms_issuance_ra_12009' },
}];

test('Standard Forms answer cites Resolution 03-2025 and effectivity advisory', () => {
  const answer = buildVerifiedProcurementAnswer(formsQuery, formsChunks);
  assert.match(answer, /21 September 2025/);
  assert.match(answer, /GPPB Resolution No\. 03-2025/);
  assert.ok(answer.includes(FORMS_URL));
  assert.ok(answer.includes(FORMS_ADVISORY_URL));
  assert.match(answer, /specific form and any permitted customization depend/i);
});

test('Standard Forms answer fails closed with official links if evidence is absent', () => {
  const answer = buildVerifiedProcurementAnswer(formsQuery, []);
  assert.match(answer, /cannot verify/i);
  assert.ok(answer.includes(FORMS_URL));
  assert.ok(answer.includes(FORMS_ADVISORY_URL));
});

const treeQuery = 'What is the purpose of the Procurement Mode Selection Decision Tree under GPPB Resolution No. 12-2025? Does its result automatically authorize a procurement mode? Cite the source.';
const treeChunks = [{
  document_name: 'GPPB Resolution No. 12-2025',
  document_type: 'gppb_resolution',
  chunk_text: 'GPPB Resolution No. 12-2025 approves the Procurement Mode Selection Decision Tree as an Annex to the IRR. The tree guides Procuring Entities in identifying potential procurement modes under Section 6 of RA No. 12009 and Section 6.3 of the IRR. Its result is not a definitive determination. The Procuring Entity must validate any suggested mode and comply with the fit-for-purpose, proportionality and accountability principles and all mode-specific legal requirements.',
  metadata: { source_url: TREE_URL, document_status: 'current_decision_tree_guidance_ra_12009' },
}];

test('Decision Tree answer says guidance, not automatic authorization, and cites both sources', () => {
  const answer = buildVerifiedProcurementAnswer(treeQuery, treeChunks);
  assert.match(answer, /does not automatically authorize/i);
  assert.match(answer, /not a definitive determination/i);
  assert.ok(answer.includes(TREE_URL));
  assert.ok(answer.includes(IRR_URL));
});

test('A mode-selection question does not invent a specific mode when material facts are missing', () => {
  const answer = buildVerifiedProcurementAnswer('Which procurement mode should MSU-Gensan use?', treeChunks);
  assert.match(answer, /cannot responsibly select a specific mode/i);
  assert.match(answer, /procurement category/i);
  assert.match(answer, /ABC/i);
  assert.match(answer, /PS-DBM/i);
});

const svpIrrChunks = [
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    document_type: 'irr',
    chunk_text: 'Section 34. Small Value Procurement. 34.1 SVP is a mode whereby the Procuring Entity requests at least three (3) price quotations for Goods not available in PS-DBM, Infrastructure Projects, and Consulting Services. Receipt of one (1) quotation is sufficient to proceed with the evaluation of bidders, provided that the amount involved does not exceed Two Million Pesos (₱2,000,000.00), subject to periodic GPPB review.',
    metadata: { source_url: IRR_URL, document_status: 'current_gppb_approved_irr_ra_12009' },
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    document_type: 'irr',
    chunk_text: '34.3(b) Except for ABCs equal to Two Hundred Thousand Pesos (₱200,000.00) and below, which shall not require posting, the RFQ or RFP shall be posted for a period of three (3) calendar days on the PhilGEPS website, website of the Procuring Entity if available, and at a conspicuous place in the premises of the Procuring Entity.',
    metadata: { source_url: IRR_URL, document_status: 'current_gppb_approved_irr_ra_12009' },
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    document_type: 'irr',
    chunk_text: '34.3(c) The BAC shall prepare and send the RFQs or RFPs to at least three (3) suppliers, contractors or consultants of known qualifications. Receipt of at least one (1) quotation is sufficient to proceed with evaluation. 34.3(d) If no quotation is received, the deadline may be extended until at least one quotation is received, but not beyond the validity of the corresponding appropriations. 34.3(f) An Abstract of Quotations or Ratings shall be prepared. 34.3(g) The BAC recommends award to the HoPE in accordance with the applicable evaluation result.',
    metadata: { source_url: IRR_URL, document_status: 'current_gppb_approved_irr_ra_12009' },
  },
];

const svpCircularChunk = {
  document_name: 'GPPB Circular No. 06-2026',
  document_type: 'gppb_circular',
  chunk_text: [
    'Sections 3.1 and 3.2: These guidelines apply to State Universities and Colleges and do not replace substantive conditions of RA No. 12009 and its IRR. Section 3.5: The enumerated eligibility document list is exclusive.',
    'Section 4.2: The BAC must state in the RFQ/RFP when documents are to be submitted.',
    'Section 4.3.1(b): If Red Membership is accepted, submit printed Merchant Details corresponding to the PhilGEPS Organization ID. Section 4.3.2: Mayor’s Permit or Business Registration Permit.',
    'Section 4.3.3: Professional License or Curriculum Vitae for consulting services procured through Take-over of Contracts or Highly Technical Consultants. Section 4.3.5: PCAB License for infrastructure projects, or Special PCAB License for a joint venture.',
    'Section 4.3.6: Income/Business Tax Return if the ABC exceeds PHP 500,000. Section 4.3.7: Omnibus Sworn Statement. Section 4.4: If the PE already maintains an updated file, it may no longer require resubmission.',
    'Section 4.7 Small Value Procurement Document Matrix: PhilGEPS Organization ID; Mayor’s Permit; Professional License/CV (Consulting); PCAB License and registration for infrastructure; Income/Business Tax Return for ABCs above PHP 500,000; Omnibus Sworn Statement for ABCs above PHP 50,000. The Professional License/CV treatment appears inconsistent between Sections 4.3.3 and 4.7 as to every SVP consulting procurement; seek GPPB clarification.',
  ].join('\n'),
  metadata: { source_url: SVP_CIRCULAR_URL, document_status: 'current_supplementary_issuance_ra_12009' },
};

const svpDocumentQuery = 'For an SUC using Small Value Procurement under RA No. 12009, explain the ₱2 million threshold, quotation requirements, posting exception, and applicable supplier documents. Distinguish IRR Section 34 from GPPB Circular No. 06-2026 and cite both sources.';

test('SVP answer separates IRR Section 34 from Circular 06-2026 and cites both', () => {
  const answer = buildVerifiedProcurementAnswer(svpDocumentQuery, [...svpIrrChunks, svpCircularChunk]);
  assert.match(answer, /up to \*\*₱2,000,000\*\*/);
  assert.match(answer, /at least three/i);
  assert.match(answer, /₱200,000 or below/i);
  assert.match(answer, /Professional License\/CV/i);
  assert.match(answer, /not an automatic award/i);
  assert.ok(answer.includes(IRR_URL));
  assert.ok(answer.includes(SVP_CIRCULAR_URL));
});

test('SVP documentary question does not use a generic answer if one official source is absent', () => {
  const answer = buildVerifiedProcurementAnswer(svpDocumentQuery, [svpCircularChunk]);
  assert.match(answer, /cannot safely provide an SVP document checklist/i);
  assert.ok(answer.includes(IRR_URL));
  assert.ok(answer.includes(SVP_CIRCULAR_URL));
});

test('General SVP answer says one quotation permits evaluation only, not automatic award', () => {
  const answer = buildVerifiedProcurementAnswer('Under RA No. 12009, what is the SVP threshold and quotation requirement?', svpIrrChunks);
  assert.match(answer, /not an automatic award/i);
  assert.match(answer, /at least three/i);
  assert.match(answer, /three \(3\) calendar days/i);
  assert.ok(answer.includes(IRR_URL));
});

const rateQuery = 'What is the prescribed standard rate for bidding documents under GPPB Circular No. 02-2026? Cite the official circular. If the indexed source does not provide the exact rate table, state that clearly instead of guessing.';
const rateChunk = {
  document_name: 'GPPB Circular No. 02-2026',
  document_type: 'gppb_circular',
  chunk_text: 'Sections 3.1–3.2: Applies to procuring entities including SUCs, for Goods, Infrastructure Projects and Consulting Services through competitive-selection modes. Section 5.2: The ABC range sets the maximum cost of bidding documents. PHP 500,000 and below — PHP 500.00; more than 500,000 up to 1 Million — 1,000.00; more than 1 Million up to 5 Million — 5,000.00; more than 5 Million up to 10 Million — 10,000.00; more than 10 Million up to 50 Million — 25,000.00; more than 50 Million up to 500 Million — 50,000.00; more than 500 Million — 75,000.00. Section 4.4 prohibits inconsistent or higher amounts.',
  metadata: { source_url: RATE_URL },
};

test('Bidding-document rates answer all seven bands and marks them as maximum fees', () => {
  const answer = buildVerifiedProcurementAnswer(rateQuery, [rateChunk]);
  for (const amount of ['₱500', '₱1,000', '₱5,000', '₱10,000', '₱25,000', '₱50,000', '₱75,000']) {
    assert.ok(answer.includes(amount), 'missing rate ' + amount);
  }
  assert.match(answer, /maximum fees/i);
  assert.ok(answer.includes(RATE_URL));
});

test('Bidding-document rates abstain if complete official rate table is not retrieved', () => {
  const answer = buildVerifiedProcurementAnswer(rateQuery, [{ ...rateChunk, chunk_text: 'Circular No. 02-2026 provides standard rates but this excerpt omits the exact rate table.' }]);
  assert.match(answer, /cannot verify/i);
  assert.ok(answer.includes(RATE_URL));
});

const bskeQuery = 'What restrictions applied during the 2026 Barangay and Sangguniang Kabataan election period under GPPB Circular No. 09-2026? State the applicable dates, explain that the rule is time-bound, and cite the official source.';
const bskeChunk = {
  document_name: 'GPPB Circular No. 09-2026',
  document_type: 'gppb_circular',
  chunk_text: [
    'The election period for the 2 November 2026 BSKE is 3 October 2026 to 9 November 2026.',
    'Section 4.1 allows procurement activities to commence and complete during the period, but release, disbursement and expenditure of public funds, including issuance of a Notice of Award, are prohibited for specified categories from 18 September 2026 until 1 November 2026.',
    'Covered categories: Public Works and Housing-Related Projects, except Sections 4.2.1 and 4.2.3; Social Welfare and Services projects, except Section 4.2.2.',
    'Ayuda, TUPAD, AKAP, AICS and 4Ps distribution is prohibited from 23 October through 2 November 2026 except burial and medical assistance normally provided to qualified individuals.',
    'Construction or maintenance of barangay-funded roads and bridges is prohibited from 23 October 2026 to 1 November 2026.',
    'Section 4.2.1 exceptions include maintenance of existing/completed public works without additional laborers; contracts awarded before 18 September; qualifying preparatory work or materials before that date; ongoing projects commenced before 22 October and listed as authorized by COMELEC; foreign-assisted projects commenced before 22 October and submitted to COMELEC; and emergency restoration after public calamity.',
    'Section 4.2.2 excludes routine and normal social-welfare expenses and other expenses authorized by COMELEC after due notice and hearing. Section 4.2.3 excludes administrative housing-related expenses and other expenses authorized by COMELEC after due notice and hearing. Section 6 requires exemption requests for covered projects to be submitted directly to COMELEC. Section 7 says these guidelines no longer apply if the 2 November 2026 BSKE is cancelled, postponed, deferred or otherwise not pursued.',
  ].join('\n'),
  metadata: { source_url: BSKE_URL },
};

test('BSKE answer preserves separate restriction windows and category-specific exceptions', () => {
  const answer = buildVerifiedProcurementAnswer(bskeQuery, [bskeChunk]);
  for (const date of ['3 October through 9 November 2026', '18 September–1 November 2026', '23 October–2 November 2026', '23 October through 1 November 2026']) {
    assert.ok(answer.includes(date), 'missing window ' + date);
  }
  assert.match(answer, /not mean that every procurement is prohibited/i);
  assert.match(answer, /These exceptions are not interchangeable across categories/i);
  assert.match(answer, /cancelled, postponed, deferred/i);
  assert.ok(answer.includes(BSKE_URL));
});

test('BSKE answer fails closed when category/date/exemption evidence is incomplete', () => {
  const answer = buildVerifiedProcurementAnswer(bskeQuery, [{ ...bskeChunk, chunk_text: 'The election period is 3 October 2026 to 9 November 2026. Procurement restrictions apply.' }]);
  assert.match(answer, /cannot verify/i);
  assert.match(answer, /project category/i);
  assert.ok(answer.includes(BSKE_URL));
});
