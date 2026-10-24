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
