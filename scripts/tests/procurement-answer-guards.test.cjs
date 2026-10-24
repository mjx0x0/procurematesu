const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVerifiedProcurementAnswer,
  isHistoricalRa9184Question,
  isSmallValueProcurementQuestion,
} = require('../../lib/procurement-answer-guards.js');

const svpChunks = [
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: 'Section 34. Small Value Procurement. 34.1 ... requests for the submission of at least three (3) price quotations ... receipt of one (1) quotation is sufficient to proceed with the evaluation of bidders ... does not exceed Two Million Pesos (₱2,000,000.00).',
  },
  {
    document_name: 'Implementing Rules and Regulations of RA 12009',
    chunk_text: '34.3(b) Except for those with ABCs equal to Two Hundred Thousand Pesos (₱200,000.00) and below which shall not require posting, RFQ or RFP shall be posted for a period of three (3) calendar days.',
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
  assert.match(answer, /Section 34\.3\(c\)/);
  assert.match(answer, /₱2,000,000/);
  assert.match(answer, /₱200,000 or below/);
  assert.match(answer, /three \(3\) calendar days/);
  assert.match(answer, /not beyond the validity of the corresponding appropriations/);
  assert.doesNotMatch(answer, /Section 50\.3\.2/);
});

test('paraphrased small-purchase question is recognized as SVP', () => {
  const query = 'Our office needs to make a relatively small purchase and obtain supplier quotations. Which procurement method should we examine?';
  assert.equal(isSmallValueProcurementQuestion(query), true);
  assert.ok(buildVerifiedProcurementAnswer(query, svpChunks));
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

test('institutional contact queries remain retrieval-grounded, not hard-coded', () => {
  const query = 'What is the exact mobile number of the current MSU-Gensan Procurement Management Office director?';
  assert.equal(buildVerifiedProcurementAnswer(query, [
    { document_name: 'MSU-GenSan University Directory', chunk_text: 'Some unrelated directory content.' },
  ]), null);
});
