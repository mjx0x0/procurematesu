/**
 * Deterministic answer guards for high-risk procurement questions.
 *
 * These handlers only return an answer when the current retrieval contains the
 * expected authoritative source material. Otherwise, the normal grounded RAG
 * path (including its abstention behavior) remains in control.
 */

const CURRENT_IRR_NAME = 'Implementing Rules and Regulations of RA 12009';

function chunkText(chunk) {
  return typeof chunk?.chunk_text === 'string' ? chunk.chunk_text : '';
}

function documentName(chunk) {
  return typeof chunk?.document_name === 'string' ? chunk.document_name.trim() : '';
}

function joinedText(chunks) {
  return chunks.map(chunkText).join('\n\n');
}

function isSmallValueProcurementQuestion(query) {
  return /\b(?:small value procurement|svp|relatively small purchase|small purchase|low[- ]cost purchase)\b/i.test(query)
    || (/\b(?:supplier|price)\s+quotations?\b/i.test(query) && /\b(?:method|threshold|posting|exception|procurement)\b/i.test(query));
}

function hasVerifiedSvpEvidence(chunks) {
  const officialChunks = chunks.filter((chunk) => documentName(chunk) === CURRENT_IRR_NAME);
  if (!officialChunks.length) return false;

  const text = joinedText(officialChunks);
  const hasSection34Threshold = /(?:Section\s+34\.\s*Small Value Procurement|34\.1[\s\S]{0,1000}Two Million Pesos|Two Million Pesos\s*\(₱?2,000,000\.00\))/i.test(text);
  const hasQuotationRule = /at least three\s*\(3\)\s*price quotations/i.test(text)
    && /one\s*\(1\)\s*quotation is sufficient to proceed with the evaluation/i.test(text);
  // The PDF chunker split subsection 34.3(b) across two rows at
  // "three (3) | calendar days"; accept the two matching source fragments
  // while still requiring both the duration and the posting-exception clause.
  const hasPostingDuration = /three\s*\(3\)\s*calendar days/i.test(text)
    || (/posted for a period of three\s*\(3\)/i.test(text) && /calendar days on the PhilGEPS website/i.test(text));
  const hasPostingRule = /shall not require posting/i.test(text) && hasPostingDuration;

  return hasSection34Threshold && hasQuotationRule && hasPostingRule;
}

function answerSmallValueProcurement() {
  return [
    '## Small Value Procurement (SVP) under RA No. 12009',
    '',
    '**Threshold — Section 34.1.** SVP covers Goods not available in PS-DBM, Infrastructure Projects, and Consulting Services. The general threshold is an amount not exceeding **₱2,000,000**, subject to periodic review and adjustment by the GPPB. Section 34.2 lists separate thresholds for local government units (LGUs); those LGU-specific amounts should not be applied to MSU-General Santos as a state university and college.',
    '',
    '**Quotation requirements — Sections 34.1 and 34.3(c).** The procuring entity requests at least three (3) price quotations and the BAC sends RFQs/RFPs to at least three (3) suppliers, contractors, or consultants of known qualifications, as applicable. Even when only one (1) quotation is received, evaluation may proceed when the applicable threshold is met. This does not mean the entity may simply skip the required requests to multiple suppliers; suppliers, contractors, or consultants who respond to a required posting must also be allowed to participate. For LGUs, apply the separate threshold schedule in Section 34.2 and relevant GPPB adjustments instead of assuming the general ₱2,000,000 amount applies uniformly.',
    '',
    '**Posting — Section 34.3(b).** Unless the ABC is **₱200,000 or below**, the RFQ/RFP must be posted for **three (3) calendar days** on the PhilGEPS website, the procuring entity’s website if available, and a conspicuous place at the entity’s premises.',
    '',
    '**Exceptions and other procedural safeguards.** The express posting exception is for ABCs of ₱200,000 or below; it is not a blanket waiver of the other applicable SVP requirements. If no price quotation is received, the procuring entity may extend the deadline until at least one quotation is received, but not beyond the validity of the corresponding appropriations (Section 34.3(d)). The BAC prepares an Abstract of Quotations or Ratings after the deadline (Section 34.3(f)) and recommends award to the HoPE in accordance with Section 34.3(g).',
    '',
    '**Source:** Government Procurement Policy Board (GPPB), *Implementing Rules and Regulations of RA No. 12009*, Sections 34.1 and 34.3(a)–(g), PDF pp. 53–54, approved under GPPB Resolution No. 02-2025. [Official GPPB-approved IRR PDF](https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf).'
  ].join('\n');
}

function isHistoricalRa9184Question(query) {
  return /\b9184\b/i.test(query)
    && /\b(?:before|prior to|previous(?:ly)?|historical(?:ly)?|history|old law|former|under the former|used to apply|applied under)\b/i.test(query)
    && (/\b12009\b/i.test(query) || /\bhistorical(?:ly)?\b|\bprevious(?:ly)?\b|\bformer\b/i.test(query));
}

function hasHistoricalLawEvidence(chunks) {
  const raText = joinedText(chunks.filter((chunk) => documentName(chunk) === 'RA 9184'));
  const irrText = joinedText(chunks.filter((chunk) => documentName(chunk) === 'IRR 2016'));
  return /Republic Act No\.?\s*9184|Government Procurement Reform Act/i.test(raText)
    && /2016 Revised Implementing Rules and Regulations|Revised Implementing Rules and Regulations.*RA No\.?\s*9184/i.test(irrText);
}

function answerHistoricalRa9184() {
  return [
    '## Historical procurement framework before RA No. 12009',
    '',
    'Before the transition to RA No. 12009, the primary statutory framework for Philippine government procurement was **Republic Act No. 9184, the Government Procurement Reform Act**, together with its **2016 Revised Implementing Rules and Regulations (IRR)**, as subsequently updated or amended by applicable issuances.',
    '',
    'This is a historical description, not guidance to automatically apply RA No. 9184 to a current procurement. If the question concerns a procurement that began during the transition to RA No. 12009, the applicable transition provisions and official GPPB guidance must be checked for that specific case.',
    '',
    '**Sources:** [Republic Act No. 9184 — Official Gazette of the Republic of the Philippines](https://officialgazette.gov.ph/2003/01/10/republic-act-no-9184/); [GPPB — RA No. 9184 and the 2016 Revised IRR](https://www.gppb.gov.ph/ra-9184-and-2016-revised-irr/).'
  ].join('\n');
}

function isMsuPurchaseRequestWorkflowQuestion(query) {
  return /\bmsu\b|\bgensan\b|mindanao state university/i.test(query)
    && /\bpurchase requests?\b|\bPR\b/i.test(query)
    && /\b(?:after|sequence|workflow|process|steps|review|validation|budget clearance|approval)\b/i.test(query);
}

function hasVerifiedPmoWorkflowEvidence(chunks) {
  const pmoChunks = chunks.filter((chunk) => /PMO Administrative Manual/i.test(documentName(chunk)));
  if (!pmoChunks.length) return false;

  const text = joinedText(pmoChunks);
  return /PPMP/i.test(text)
    && /\bAPP\b/i.test(text)
    && /PMO Director/i.test(text)
    && /Budget Management Office/i.test(text)
    && /Chancellor|authorized approving authority/i.test(text);
}

function answerMsuPurchaseRequestWorkflow() {
  return [
    '## MSU-General Santos Purchase Request workflow',
    '',
    'According to the **PMO Administrative Manual, Section IV (“Process Flow”), PDF page 12**, the internal sequence after the end-user submits a Purchase Request (PR) is:',
    '',
    '1. **Receipt:** The PMO receives the duly accomplished PR from the end-user unit.',
    '2. **PPMP/APP verification:** The PMO checks the PR against the approved Project Procurement Management Plan (PPMP) and Annual Procurement Plan (APP).',
    '3. **PMO Director validation:** The PR is forwarded to the PMO Director for review, validation, and signature.',
    '4. **Control and logging:** The validated PR receives a control number and is recorded in the procurement tracking log.',
    '5. **Budget clearance:** The controlled PR is endorsed to the Budget Management Office to confirm fund availability and obtain obligation clearance.',
    '6. **Approving authority:** The PMO receives the PR signed by the Chancellor or the authorized approving authority.',
    '7. **RFQ preparation:** The PMO prepares the Request for Quotation (RFQ) from the approved PR, including the relevant specifications and Approved Budget for the Contract (ABC).',
    '',
    '**Important distinction:** These are internal MSU-Gensan routing steps from the PMO manual. They are not, by themselves, a complete statement of national procurement law. The lawful procurement method and its thresholds, posting, quotation, and award requirements must be assessed under RA No. 12009, its applicable IRR, and current GPPB issuances.',
    '',
    '**Source:** MSU-Gensan *PMO Administrative Manual*, Section IV (“Process Flow”), PDF p. 12 (internal procedure).'
  ].join('\n');
}

/**
 * @param {string} query
 * @param {Array<{document_name?: string, chunk_text?: string}>} chunks
 * @returns {string|null}
 */
function buildVerifiedProcurementAnswer(query, chunks) {
  if (!Array.isArray(chunks)) return null;

  // Historical intent must take precedence when the user asks about RA 9184,
  // even if the same question also mentions SVP or quotation requirements.
  if (isHistoricalRa9184Question(query) && hasHistoricalLawEvidence(chunks)) {
    return answerHistoricalRa9184();
  }

  if (isSmallValueProcurementQuestion(query) && hasVerifiedSvpEvidence(chunks)) {
    return answerSmallValueProcurement();
  }

  if (isMsuPurchaseRequestWorkflowQuestion(query) && hasVerifiedPmoWorkflowEvidence(chunks)) {
    return answerMsuPurchaseRequestWorkflow();
  }

  return null;
}

module.exports = {
  buildVerifiedProcurementAnswer,
  isSmallValueProcurementQuestion,
  isHistoricalRa9184Question,
};
