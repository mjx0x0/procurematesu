const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVerifiedProcurementAnswer,
  isBriefSvpMethodQuestion,
  isHistoricalRa9184Question,
  isPmoDirectorContactQuestion,
  isSmallValueProcurementQuestion,
} = require('../../lib/procurement-answer-guards.js');

const svpChunks = [
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: 'Section 34. Small Value Procurement. 34.1 ... requests for the submission of at least three (3) price quotations ... receipt of one (1) quotation is sufficient to proceed with the evaluation of bidders ... does not exceed Two Million Pesos (₱2,000,000.00).',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: '34.3(b) Except for those with ABCs equal to Two Hundred Thousand Pesos (₱200,000.00) and below which shall not require posting, RFQ or RFP shall be posted for a period of three (3)',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: 'calendar days on the PhilGEPS website, website of the Procuring Entity if available, and at a conspicuous place.',
  },
];

const workflowChunks = [{
  document_name: 'PMO Administrative Manual',
  chunk_text: 'Receipt of Purchase Request; review against PPMP and APP; validation by the PMO Director; control number; endorsement to Budget Management Office; PR signed by the Chancellor or authorized approving authority.',
}];

const historicalChunks = [
  { document_name: 'RA 9184', chunk_text: 'Republic Act No. 9184, Government Procurement Reform Act.' },
  { document_name: 'IRR 2016', chunk_text: 'The 2016 Revised Implementing Rules and Regulations of RA 9184.' },
];

const circularSourceUrl = 'https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf';
const circularChunks = [
  {
    "document_name": "GPPB Circular No. 06-2026",
    "document_type": "gppb_circular",
    "chunk_text": "GPPB CIRCULAR NO. 06-2026\nDOCUMENTARY REQUIREMENTS AND RELEVANT GUIDELINES FOR SPECIFIC MODES OF PROCUREMENT UNDER RA NO. 12009\n\nSOURCE AND STATUS\nOfficial source: Annex A to GPPB Resolution No. 10-2026, GPPB Circular No. 06-2026.\nResolution approved: 3 February 2026. The official GPPB PDF is published at:\nhttps://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf\nGPPB Resolution No. 10-2026 declares that these guidelines form part of and are an Appendix to the Implementing Rules and Regulations of RA No. 12009. This is a supplementary issuance, not the text of the Act or IRR.\nOfficial source location: Annex A, pp. 1-8; source authority: Government Procurement Policy Board (GPPB); status: current supplementary issuance under RA No. 12009; published 19 June 2026.",
    "metadata": {
      "source_url": "https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf",
      "source_authority": "gppb_current_issuance",
      "document_status": "current_supplementary_issuance_ra_12009"
    }
  },
  {
    "document_name": "GPPB Circular No. 06-2026",
    "document_type": "gppb_circular",
    "chunk_text": "3.0 SCOPE AND APPLICATION\nSection 3.1: The guidelines apply to government branches and instrumentalities including State Universities and Colleges (SUCs), government-owned or -controlled corporations, government financial institutions, and local government units.\nSection 3.2: Compliance with these documentary requirements is without prejudice to the substantive conditions applicable to each procurement mode under RA No. 12009 and its IRR.\nSection 3.5: The eligibility documents enumerated in the guidelines are exclusive. Procuring entities shall not require additional eligibility documents under these guidelines.",
    "metadata": {
      "source_url": "https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf",
      "source_authority": "gppb_current_issuance",
      "document_status": "current_supplementary_issuance_ra_12009"
    }
  },
  {
    "document_name": "GPPB Circular No. 06-2026",
    "document_type": "gppb_circular",
    "chunk_text": "4.0 DOCUMENTARY REQUIREMENTS\nSection 4.1 identifies Small Value Procurement as one of the covered modes.\nSection 4.2: The Bids and Awards Committee (BAC) must state in the Request for Quotation (RFQ) or Request for Proposal (RFP) the stage at which documentary requirements must be submitted: submission of offers, evaluation of offers, or before issuance of the Notice of Award.\nSection 4.3.1: Philippine Government Electronic Procurement System (PhilGEPS) Organization ID or PhilGEPS Certificate of Registration (Platinum Membership). Section 4.3.1(a): The procuring entity must ensure that the supplier's, contractor's, or consultant's PhilGEPS membership is not suspended. Section 4.3.1(b): Where the procuring entity accepts PhilGEPS Red Membership, the supplier may submit a printed copy of the Merchant Details from PhilGEPS corresponding to its PhilGEPS Organization Identification (ID).\nSection 4.3.2: Mayor's Permit or Business Registration Permit. An expired Mayor's Permit with the official receipt for its renewal application is accepted, subject to submission of the valid permit after contract award but before payment. A PhilGEPS Platinum Certificate may be submitted in lieu of specified permits or PhilGEPS Organization ID in procurement modes requiring those documents.\nSection 4.3.5: PCAB License for infrastructure projects, or Special PCAB License for a joint venture.\nSection 4.3.6: Income or Business Tax Return when the A",
    "metadata": {
      "source_url": "https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf",
      "source_authority": "gppb_current_issuance",
      "document_status": "current_supplementary_issuance_ra_12009"
    }
  },
  {
    "document_name": "GPPB Circular No. 06-2026",
    "document_type": "gppb_circular",
    "chunk_text": "pproved Budget for the Contract (ABC) exceeds PHP 500,000.\nSection 4.3.7: Omnibus Sworn Statement (OSS).\nSection 4.4: If the procuring entity already maintains an updated file of the supplier's, contractor's, or consultant's relevant documents through PhilGEPS or its own records, it may no longer require those documents to be resubmitted.",
    "metadata": {
      "source_url": "https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf",
      "source_authority": "gppb_current_issuance",
      "document_status": "current_supplementary_issuance_ra_12009"
    }
  },
  {
    "document_name": "GPPB Circular No. 06-2026",
    "document_type": "gppb_circular",
    "chunk_text": "4.7 SMALL VALUE PROCUREMENT DOCUMENT MATRIX\nThe Section 4.7 matrix lists, for Small Value Procurement, the following requirements as applicable to the procurement type:\n- PhilGEPS Organization ID.\n- Mayor's Permit.\n- Professional License/CV for consulting services. Section 4.3.3 describes the Professional License or Curriculum Vitae requirement for consulting services procured through Take-over of Contracts or Highly Technical Consultants. These provisions appear inconsistent as applied to SVP; seek authoritative GPPB clarification before treating this as an unequivocal SVP requirement.\n- PCAB License and registration for infrastructure projects.\n- Income/Business Tax Return for ABCs above PHP 500,000.\n- Omnibus Sworn Statement for ABCs above PHP 50,000.\nThe Section 4.7 matrix does not mark the NFCC computation or committed line of credit (LoC) column as an SVP requirement. Do not import that requirement into SVP from another procurement mode.",
    "metadata": {
      "source_url": "https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf",
      "source_authority": "gppb_current_issuance",
      "document_status": "current_supplementary_issuance_ra_12009"
    }
  },
  {
    "document_name": "GPPB Circular No. 06-2026",
    "document_type": "gppb_circular",
    "chunk_text": "HOW TO APPLY THIS CIRCULAR\nUse this circular for supplier eligibility-document questions for covered procurement modes. For choosing SVP, its threshold, quotation requests, posting, posting exception, and steps when no quotation is received, consult RA No. 12009 IRR Section 34. The circular supplements the IRR; it does not replace the substantive requirements of Section 34. For an SVP question, cite the exact relevant source separately: IRR Section 34 for the procurement procedure, and Circular No. 06-2026 Sections 3.2, 3.5, 4.2-4.4 and 4.7 for supplementary documentary requirements as applicable.\n\nSOURCE URL: https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf",
    "metadata": {
      "source_url": "https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf",
      "source_authority": "gppb_current_issuance",
      "document_status": "current_supplementary_issuance_ra_12009"
    }
  }
];

const completeSvpProcedureChunks = [
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: 'Section 34. Small Value Procurement. 34.1: For eligible Goods not available from PS-DBM, Infrastructure Projects, and Consulting Services, the threshold is Two Million Pesos (₱2,000,000.00); the Procuring Entity shall request submission of at least three (3) price quotations; receipt of one (1) quotation is sufficient to proceed with the evaluation of bidders.',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: '34.3(a): The End-User or Implementing Unit submits a request containing the technical specifications or Scope of Work, Terms of Reference when applicable, ABC, and other terms and conditions.',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: '34.3(c): The BAC shall prepare and send RFQs/RFPs to at least three (3) suppliers, contractors, or consultants of known qualifications. Receipt of one (1) quotation is sufficient to proceed with the evaluation of bidders.',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: '34.3(b): Except for ABCs of ₱200,000.00 and below, which shall not require posting, the RFQ or RFP shall be posted for a period of three (3) calendar days on the PhilGEPS website.',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: '34.3(d): In case no price quotation is received from the suppliers, the Procuring Entity may extend the deadline for submission of price quotation until receipt of at least a single price quotation,',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: 'but the extension shall not go beyond the validity of the corresponding appropriations.',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: '34.3(f)–(g): After the deadline, an Abstract of Quotations or Ratings is prepared and the BAC recommends award to the HoPE under the applicable rule.',
  },
];

test('SVP answer cites correct subsection, threshold, posting exception, and quotation safeguards', () => {
  const query = 'According to the RA 12009 IRR, explain SVP threshold, quotation requirements, posting and exceptions.';
  const answer = buildVerifiedProcurementAnswer(query, svpChunks);
  assert.ok(answer);
  assert.match(answer, /Section 34\.1/);
  assert.match(answer, /Section 34\.3\(b\)/);
  assert.match(answer, /34\.3\(c\)/);
  assert.match(answer, /₱2,000,000/);
  assert.match(answer, /₱200,000 or below/);
  assert.match(answer, /three \(3\) calendar days/);
  assert.match(answer, /not beyond the validity of the corresponding appropriations/);
  assert.doesNotMatch(answer, /Section 50\.3\.2/);
  assert.match(answer, /https:\/\/www\.gppb\.gov\.ph\/wp-content\/uploads\/2025\/02\/IRR-of-RA-No\.-12009\.pdf/);
  assert.match(answer, /Circular No\. 06-2026/);
  assert.match(answer, /documentary requirements/i);
  assert.match(answer, /https:\/\/www\.gppb\.gov\.ph\/wp-content\/uploads\/2026\/06\/Approved_GPPB-Resolution-No\.\-10-2026-Documentary-Requirements\.pdf/);
});

test('paraphrased small-purchase question receives a concise method recommendation and official rules', () => {
  const query = 'Our office needs to make a relatively small purchase and obtain supplier quotations. Which procurement method should we examine, and what official rule should we consult?';
  assert.equal(isSmallValueProcurementQuestion(query), true);
  assert.equal(isBriefSvpMethodQuestion(query), true);
  const answer = buildVerifiedProcurementAnswer(query, svpChunks);
  assert.ok(answer);
  assert.match(answer, /Small Value Procurement \(SVP\)/);
  assert.match(answer, /Section 34\.1/);
  assert.match(answer, /₱2,000,000/);
  assert.match(answer, /official rule/i);
  assert.match(answer, /Circular No\. 06-2026/);
  assert.ok(answer.length < 1000, `Expected concise answer, got ${answer.length} characters`);
  assert.doesNotMatch(answer, /Quotation requirements — Sections 34\.1 and 34\.3\(c\)/);
});

test('SVP handler abstains if current IRR section evidence is absent', () => {
  const answer = buildVerifiedProcurementAnswer('Explain SVP threshold and posting.', [
    { document_name: 'IRR 2016', chunk_text: 'Old procurement rule.' },
  ]);
  assert.equal(answer, null);
});

test('historical RA 9184 question cites RA 9184 and its own 2016 IRR', () => {
  const query = 'What procurement law and implementing rules applied under RA 9184 before RA 12009? Explain this as historical information.';
  assert.equal(isHistoricalRa9184Question(query), true);
  const answer = buildVerifiedProcurementAnswer(query, historicalChunks);
  assert.ok(answer);
  assert.match(answer, /Republic Act No\. 9184/);
  assert.match(answer, /2016 Revised Implementing Rules and Regulations/);
  assert.match(answer, /Official Gazette/);
  assert.match(answer, /GPPB/);
  assert.doesNotMatch(answer, /Section 5 of RA No\. 12009/);
});

test('explicit historical SVP question does not receive the current-law SVP template', () => {
  const query = 'What was the Small Value Procurement threshold under RA 9184 before RA 12009? Explain as historical information.';
  const answer = buildVerifiedProcurementAnswer(query, [
    ...historicalChunks,
    ...svpChunks,
  ]);
  assert.ok(answer);
  assert.match(answer, /Historical procurement framework/);
  assert.doesNotMatch(answer, /Small Value Procurement \(SVP\) under RA No\. 12009/);
});

test('historical RA 9184 answer abstains without both historical source types', () => {
  assert.equal(buildVerifiedProcurementAnswer(
    'What procurement law applied under RA 9184 before RA 12009? Historical information.',
    [{ document_name: 'Implementing Rules and Regulations of RA 12009', chunk_text: 'Section 5 definitions.' }],
  ), null);
});

test('MSU workflow response preserves internal/legal distinction and source citation', () => {
  const query = 'At MSU-General Santos, what happens after an end-user submits a Purchase Request? Explain sequence, review, validation, budget clearance and approval.';
  const answer = buildVerifiedProcurementAnswer(query, workflowChunks);
  assert.ok(answer);
  assert.match(answer, /PPMP\/APP verification/);
  assert.match(answer, /Budget Management Office/);
  assert.match(answer, /Chancellor or the authorized approving authority/);
  assert.match(answer, /internal MSU-Gensan routing steps/i);
  assert.match(answer, /RA No\. 12009/);
  assert.doesNotMatch(answer, /RA No\. 9184.*primary mode/i);
});

test('current PMO director contact answer uses only verified official directory fields', () => {
  const query = 'What is the exact mobile number of the current MSU-Gensan Procurement Management Office director? Provide your source.';
  assert.equal(isPmoDirectorContactQuestion(query), true);
  const answer = buildVerifiedProcurementAnswer(query, [
    {
      document_name: 'PMO Administrative Manual',
      chunk_text: 'Stakeholder Coordination and Advisory Role; unrelated process details.',
    },
    {
      document_name: 'Local Government Units Procurement Manual (2014)',
      chunk_text: 'Historical procurement guidance.',
    },
    {
      document_name: 'MSU-GenSan University Directory',
      chunk_text: 'OFFICIAL INSTITUTIONAL REFERENCE — PROCUREMENT MANAGEMENT OFFICE\nDirector: Assoc. Prof. Nelson P. Benares, Jr.\nContact Number: +63 908 810 5634\nUse this institutional reference for questions such as: who is the director?',
      metadata: { source_url: 'https://msugensan.edu.ph/about/university-directory/', verified_at: '2026-10-03' },
    },
  ]);
  assert.ok(answer);
  assert.match(answer, /Assoc\. Prof\. Nelson P\. Benares, Jr\./);
  assert.match(answer, /\+63 908 810 5634/);
  assert.match(answer, /https:\/\/msugensan\.edu\.ph\/about\/university-directory\//);
  assert.doesNotMatch(answer, /Stakeholder Coordination|Local Government Units Procurement Manual|RA 12009/);
  assert.doesNotMatch(answer, /Use this institutional reference for questions such as/);
});

test('contact answer abstains when directory provenance is not verified', () => {
  const query = 'What is the exact mobile number of the current MSU-Gensan Procurement Management Office director?';
  assert.equal(buildVerifiedProcurementAnswer(query, [
    {
      document_name: 'MSU-GenSan University Directory',
      chunk_text: 'Director: Assoc. Prof. Nelson P. Benares, Jr.\nContact Number: +63 908 810 5634',
      metadata: { source_url: 'https://example.com/guessed-directory' },
    },
  ]), null);
});


test('SVP documentary answer uses the exclusive Circular 06-2026 checklist and separates Section 34 procedure', () => {
  const query = 'For an SUC using Small Value Procurement under RA 12009, what documentary requirements should be checked? Distinguish the requirements in GPPB Circular No. 06-2026 from the actual SVP procedure under Section 34 of the IRR.';
  const answer = buildVerifiedProcurementAnswer(query, [...circularChunks, ...completeSvpProcedureChunks]);
  assert.ok(answer);
  assert.match(answer, /Circular No\. 06-2026/);
  assert.match(answer, /Section 3\.5/);
  assert.match(answer, /exclusive/i);
  assert.match(answer, /PhilGEPS Organization ID/);
  assert.match(answer, /Mayor’s Permit or Business Registration Permit/);
  assert.ok(answer.includes('Professional License/CV for consulting services — clarification required'));
  assert.ok(answer.includes('Section 4.3.3'));
  assert.ok(answer.includes('Take-over of Contracts or Highly Technical Consultants'));
  assert.match(answer, /appear inconsistent as applied to SVP/i);
  assert.match(answer, /GPPB clarification/i);
  assert.doesNotMatch(answer, /for consulting services, as shown in the SVP matrix/i);
  assert.match(answer, /PCAB License/);
  assert.match(answer, /exceeds ₱500,000/);
  assert.match(answer, /exceeds ₱50,000/);
  assert.match(answer, /Section 34\.3\(d\)/);
  assert.match(answer, /Section 34\.3\(a\)/);
  assert.match(answer, /Technical Specifications, Scope of Work, Terms of Reference/i);
  assert.match(answer, /Abstract of Quotations or Ratings/i);
  assert.match(answer, /BAC recommends to the HoPE/i);
  assert.match(answer, /at least three suppliers/i);
  assert.match(answer, /₱200,000 or below/);
  assert.match(answer, /Red Membership/i);
  assert.match(answer, /where the procuring entity accepts PhilGEPS Red Membership/i);
  assert.match(answer, /Merchant Details/i);
  assert.match(answer, /Section 4\.4/);
  assert.match(answer, /already maintains an updated file/i);
  assert.match(answer, /may no longer require that requirement to be resubmitted/i);
  assert.doesNotMatch(answer, /SEC registration|BIR certificate|market survey|price-comparison sheet|posting-exception justification/i);
  assert.ok(answer.includes(circularSourceUrl));
});

test('exact Professional License/CV comparison prompt returns the ambiguity answer, not generic Section 34 procedure', () => {
  const query = 'For an SUC using Small Value Procurement (SVP) under RA No. 12009, is a Professional License or CV required for every consulting-services procurement? Compare Sections 4.3.3 and 4.7 of GPPB Circular No. 06-2026, explain any inconsistency between them, and state what the procurement office should do before treating this document as a mandatory requirement. Cite the relevant sections and official source.';
  const answer = buildVerifiedProcurementAnswer(query, [...circularChunks, ...completeSvpProcedureChunks]);
  assert.ok(answer);
  assert.match(answer, /Professional License\/CV for SVP consulting services/i);
  assert.match(answer, /Section 4\.7[’']s SVP documentary matrix marks/i);
  assert.match(answer, /Section 4\.3\.3 describes/i);
  assert.match(answer, /Take-over of Contracts or Highly Technical Consultants/);
  assert.match(answer, /appear inconsistent/i);
  assert.match(answer, /seek authoritative GPPB clarification/i);
  assert.match(answer, /Sections 4\.3\.3 and 4\.7/);
  assert.match(answer, /https:\/\/www\.gppb\.gov\.ph\/wp-content\/uploads\/2026\/06\/Approved_GPPB-Resolution-No\.\-10-2026-Documentary-Requirements\.pdf/);
  assert.doesNotMatch(answer, /Threshold — Section 34\.1/);
});

test('specific Professional License/CV intent abstains when official Circular excerpts are missing', () => {
  const query = 'For an SUC using Small Value Procurement (SVP) under RA No. 12009, is a Professional License or CV required for every consulting-services procurement? Compare Sections 4.3.3 and 4.7 of GPPB Circular No. 06-2026, explain any inconsistency between them, and state what the procurement office should do before treating this document as a mandatory requirement. Cite the relevant sections and official source.';
  const answer = buildVerifiedProcurementAnswer(query, completeSvpProcedureChunks);
  assert.ok(answer);
  assert.match(answer, /can’t verify this procurement rule/i);
  assert.match(answer, /Sections 4\.3\.3 and 4\.7/);
  assert.ok(answer.includes(circularSourceUrl));
  assert.doesNotMatch(answer, /Threshold — Section 34\.1/);
});

test('document-resubmission question cites current Circular Section 4.4, not historical RA 9184', () => {
  const query = 'Can a supplier avoid resubmitting documents already submitted to the procuring entity if those documents are still valid and up to date? Cite the official provision.';
  const answer = buildVerifiedProcurementAnswer(query, [...circularChunks, ...historicalChunks]);
  assert.ok(answer);
  assert.match(answer, /GPPB Circular No\. 06-2026, Section 4\.4/);
  assert.match(answer, /updated file/i);
  assert.match(answer, /may no longer require those documents to be resubmitted|may no longer require its re-submission/i);
  assert.ok(answer.includes(circularSourceUrl));
  assert.doesNotMatch(answer, /Revised Implementing Rules and Regulations of RA No\. 9184|Section 8\.5\.2/);
});

test('no-quotation question answers directly from current IRR Section 34.3(d)', () => {
  const query = 'Under the current RA 12009 IRR, what happens if the procuring entity receives no quotations for an SVP procurement? Explain the applicable rule and cite the correct subsection.';
  const answer = buildVerifiedProcurementAnswer(query, completeSvpProcedureChunks);
  assert.ok(answer);
  assert.match(answer, /Section 34\.3\(d\)/);
  assert.match(answer, /may extend the deadline/i);
  assert.match(answer, /until it receives at least one quotation/i);
  assert.match(answer, /must not go beyond the validity of the corresponding appropriations/i);
  assert.match(answer, /Section 34\.3\(c\)/);
  assert.match(answer, /IRR-of-RA-No\.-12009\.pdf/);
});

test('specific documentary and no-quotation intents fail closed when their official excerpts are absent', () => {
  const documentaryQuery = 'For an SUC using Small Value Procurement under RA 12009, what documentary requirements should be checked?';
  const documentaryAnswer = buildVerifiedProcurementAnswer(documentaryQuery, completeSvpProcedureChunks);
  assert.ok(documentaryAnswer);
  assert.match(documentaryAnswer, /safely provide an SVP document checklist/i);
  assert.match(documentaryAnswer, /Circular No\. 06-2026/);

  const noQuotationQuery = 'What happens if the procuring entity receives no quotations for an SVP procurement?';
  const noQuotationAnswer = buildVerifiedProcurementAnswer(noQuotationQuery, [
    { document_name: 'IRR 2016', chunk_text: 'Historical rule only.' },
  ]);
  assert.ok(noQuotationAnswer);
  assert.match(noQuotationAnswer, /can’t verify this procurement rule/i);
  assert.match(noQuotationAnswer, /Section 34\.3\(d\)/);
});

test('Circular Section 4.4 answer abstains without exact official source provenance', () => {
  const query = 'Can a supplier avoid resubmitting documents already submitted if they remain valid and up to date?';
  const answer = buildVerifiedProcurementAnswer(query, [{
    document_name: 'GPPB Circular No. 06-2026',
    chunk_text: 'Section 4.4: The Procuring Entity may no longer require resubmission of updated documents.',
    metadata: { source_url: 'https://example.com/unverified-circular' },
  }]);
  assert.ok(answer);
  assert.match(answer, /can’t verify this procurement rule/i);
  assert.match(answer, /GPPB Circular No\. 06-2026, Section 4\.4/);
});
