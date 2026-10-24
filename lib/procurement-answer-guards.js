/**
 * Deterministic answer guards for high-risk procurement questions.
 *
 * These handlers only return an answer when the current retrieval contains the
 * expected authoritative source material. Otherwise, the normal grounded RAG
 * path (including its abstention behavior) remains in control.
 */

const CURRENT_IRR_NAME = 'Implementing Rules and Regulations of RA 12009';
const DIRECTORY_NAME = 'MSU-GenSan University Directory';
const DIRECTORY_URL = 'https://msugensan.edu.ph/about/university-directory/';
const CIRCULAR_NAME = 'GPPB Circular No. 06-2026';
const CIRCULAR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf';
const CURRENT_IRR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf';

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

function isSvpDocumentaryRequirementsQuestion(query) {
  return isSmallValueProcurementQuestion(query)
    && /\b(?:documentary requirements?|eligibility documents?|supplier documents?|documents? (?:to check|to submit|required|should be checked)|document checklist)\b/i.test(query);
}

function isCircularResubmissionQuestion(query) {
  return /\b(?:resubmit(?:ting)?|re-submi(?:t|tting)|re-submission|submit again|resubmission)\b/i.test(query)
    && /\b(?:documents?|requirements?|already submitted|updated file|valid|up to date|current)\b/i.test(query);
}

function isNoSvpQuotationQuestion(query) {
  return isSmallValueProcurementQuestion(query)
    && /\b(?:no|zero)\s+(?:(?:price|supplier)\s+)?quotations?\b|\b(?:receives?|received|gets?|got)\s+no\s+(?:(?:price|supplier)\s+)?quotations?\b/i.test(query);
}

function officialCircularChunks(chunks) {
  return chunks.filter((chunk) => {
    if (documentName(chunk) !== CIRCULAR_NAME) return false;
    const metadata = chunk?.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {};
    return typeof metadata.source_url === 'string'
      && metadata.source_url.replace(/\/$/, '') === CIRCULAR_URL;
  });
}

function hasVerifiedCircularResubmissionEvidence(chunks) {
  const text = joinedText(officialCircularChunks(chunks));
  // Match the actual ingested text ("already maintains an updated file"; "may
  // no longer require those documents to be resubmitted"), not just a fixture
  // paraphrase. Chunk boundaries are irrelevant after joining verified chunks.
  return /Section\s*4\.4/i.test(text)
    && /maintain(?:s|ing)? an updated file/i.test(text)
    && /may no longer require[^.]{0,180}(?:re-?submission|resubmitted)/i.test(text);
}

function hasVerifiedSvpDocumentaryEvidence(chunks) {
  const official = officialCircularChunks(chunks);
  if (!official.length) return false;
  const text = joinedText(official);
  // The six ingested rows split the circular into paragraph-based chunks.
  // Validate each required concept independently across those provenance-
  // verified chunks: Section 4.3.7 names the OSS, while the ABC > PHP 50,000
  // condition appears later in the Section 4.7 SVP matrix.
  return /Section\s*3\.5/i.test(text)
    && /exclusive/i.test(text)
    && /Section\s*4\.2/i.test(text)
    && /Request for Quotation|\bRFQ\b/i.test(text)
    && /Section\s*4\.7/i.test(text)
    && /PhilGEPS Organization ID/i.test(text)
    && /Mayor.?s Permit/i.test(text)
    && /Professional License\s*\/?\s*CV/i.test(text)
    && /PCAB License/i.test(text)
    && /Income(?:\/| or )Business Tax Return/i.test(text)
    && /Omnibus Sworn Statement/i.test(text)
    && /above PHP 50,000/i.test(text);
}

function hasNoQuotationEvidence(chunks) {
  const text = joinedText(chunks.filter((chunk) => documentName(chunk) === CURRENT_IRR_NAME));
  // Allow a PDF parser to split the sentence across adjacent database chunks,
  // and allow punctuation/line-break variation while requiring all operative
  // elements from the official Section 34.3(d) wording.
  return /in case no price quotation is received from (?:the )?suppliers/i.test(text)
    && /may extend the deadline for submission of price quotation/i.test(text)
    && /until receipt of at least a single price quotation/i.test(text)
    && /extension shall not go beyond (?:the )?validity of the corresponding appropriations/i.test(text);
}

function hasVerifiedSvpProcedureEvidence(chunks) {
  // The regular SVP checklist requires threshold, quotation and posting rules.
  // The no-quotation contingency is gated separately for questions that ask it.
  return hasVerifiedSvpEvidence(chunks);
}

function answerEvidenceUnavailable(sourceDescription, sourceUrl) {
  return [
    'I can’t verify this procurement rule from the authoritative excerpts retrieved for this question, so I will not infer a requirement or substitute a historical RA No. 9184 rule.',
    '',
    'Please consult the official source directly before acting: **' + sourceDescription + '** (' + sourceUrl + '). The knowledge base must retrieve the applicable provision before this answer can be confirmed.',
  ].join('\n');
}

function answerSvpDocumentaryEvidenceUnavailable() {
  return [
    'I can’t safely provide an SVP document checklist because the retrieved excerpts did not verify both the Circular’s exclusive eligibility list and the current IRR procedure. I will not infer additional eligibility requirements.',
    '',
    '**Check the official sources directly:** [GPPB Circular No. 06-2026, Sections 3.1–3.5 and 4.2–4.7](' + CIRCULAR_URL + ') and [GPPB-approved IRR of RA No. 12009, Section 34](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}

function answerCircularResubmission() {
  return [
    'Yes, subject to the condition in **GPPB Circular No. 06-2026, Section 4.4**: when the Procuring Entity already maintains an updated file of the supplier’s, contractor’s, or consultant’s applicable documents—through the PhilGEPS Certificate of Registration or its own records—it may no longer require those documents to be resubmitted.',
    '',
    'This is conditional on the Procuring Entity already maintaining an updated file of the relevant documents; it is not a blanket exemption for every document or for outdated records.',
    '',
    '**Official source:** [GPPB Circular No. 06-2026, Annex A to Resolution No. 10-2026, Section 4.4](' + CIRCULAR_URL + ').',
  ].join('\n');
}

function answerNoSvpQuotation() {
  return [
    'Under **Section 34.3(d) of the GPPB-approved IRR of RA No. 12009**, when no price quotation is received, the Procuring Entity **may extend the deadline** for submitting price quotations until it receives at least one quotation. The extension **must not go beyond the validity of the corresponding appropriations**.',
    '',
    'Section 34.3(c) separately says that receipt of at least one quotation is sufficient to proceed with evaluation. This does not waive the requirement to send RFQs/RFPs to at least three qualified suppliers, contractors, or consultants, as applicable.',
    '',
    '**Official source:** [IRR of RA No. 12009, Section 34.3(c)–(d)](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}

function answerSvpDocumentaryRequirements() {
  return [
    '## SVP documentary requirements for an SUC',
    '',
    '**GPPB Circular No. 06-2026 is supplementary guidance.** It applies to SUCs (Section 3.1), does not replace the substantive conditions for SVP under the RA No. 12009 IRR (Section 3.2), and makes its enumerated eligibility-document list exclusive (Section 3.5).',
    '',
    '**Supplier documents under Circular Sections 4.3 and 4.7, as applicable:**',
    '- **PhilGEPS Organization ID or Certificate of Registration (Platinum Membership):** the procuring entity must ensure the supplier’s membership is not suspended.',
    '- **Mayor’s Permit or Business Registration Permit.** An expired Mayor’s Permit with the official receipt for its renewal application is accepted, subject to submission of the valid permit after contract award but before payment. Where permitted by Section 4.3.2(b), a PhilGEPS Platinum Certificate may be used in lieu of the specified permit or Organization ID.',
    '- **Professional License or CV:** for consulting services, as shown in the SVP matrix.',
    '- **PCAB License and registration:** for infrastructure projects; a Special PCAB License applies in the case of a joint venture.',
    '- **Income or Business Tax Return:** when the ABC exceeds ₱500,000.',
    '- **Omnibus Sworn Statement (OSS):** when the ABC exceeds ₱50,000.',
    '',
    'Under Section 4.2, the BAC must state in the RFQ/RFP when the applicable documents are to be submitted: with the offer, during evaluation, or before issuance of the Notice of Award. Do not add other eligibility documents solely under this circular; its Section 3.5 list is exclusive.',
    '',
    '**Separate substantive procedure under Section 34 of the IRR:** the general SVP threshold is up to ₱2,000,000 for eligible Goods not available from PS-DBM, Infrastructure Projects, and Consulting Services under Section 34.1. Section 34.3 governs the request, quotation, posting, and evaluation steps: the BAC sends RFQs/RFPs to at least three qualified suppliers/contractors/consultants; receipt of one quotation allows evaluation to proceed; posting is for three calendar days unless the ABC is ₱200,000 or below; and if no quotation is received, Section 34.3(d) permits an extension only up to the validity of the corresponding appropriations. One quotation is not an automatic award.',
    '',
    '**Official sources:** [GPPB Circular No. 06-2026, Sections 3.1–3.5 and 4.2–4.7](' + CIRCULAR_URL + '); [GPPB-approved IRR of RA No. 12009, Sections 34.1 and 34.3(a)–(g)](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}


function isBriefSvpMethodQuestion(query) {
  const asksForMethod = /\b(?:which|what)\s+(?:procurement\s+)?method\b/i.test(query)
    || /what official rule should we consult/i.test(query);
  const asksForDetailedRules = /\b(?:threshold|posting requirements?|posting period|exceptions?|applicable subsections|quotation requirements?|how many quotations|three calendar days|section 34\.3)\b/i.test(query)
    || /identify the applicable/i.test(query)
    || /explain the (?:small value procurement )?procedure/i.test(query);

  return asksForMethod && !asksForDetailedRules;
}

function isPmoDirectorContactQuestion(query) {
  return /\b(?:mobile|phone|telephone|contact number|number to call)\b/i.test(query)
    && /\b(?:director|head|person in charge)\b/i.test(query)
    && /\b(?:procurement|pmo|pro)\b/i.test(query);
}

function answerVerifiedPmoDirectorContact(chunks) {
  const directoryChunk = chunks.find((chunk) => {
    if (documentName(chunk) !== DIRECTORY_NAME) return false;
    const metadata = chunk?.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {};
    const sourceUrl = typeof metadata.source_url === 'string' ? metadata.source_url : '';
    return /^https:\/\/msugensan\.edu\.ph\/about\/university-directory\/?$/i.test(sourceUrl);
  });

  if (!directoryChunk) return null;

  const text = chunkText(directoryChunk);
  const directorMatch = text.match(/Director:\s*(Assoc\.\s*Prof\.\s*Nelson P\.\s*Benares,\s*Jr\.)/i);
  const numberMatch = text.match(/Contact Number:\s*(\+?[0-9][0-9\s()\-]{6,})/i);
  if (!directorMatch || !numberMatch) return null;

  const contactNumber = numberMatch[1].replace(/\s+/g, ' ').trim();
  return [
    '**The official MSU-GenSan directory lists the Procurement Management Office Director as:** ' + directorMatch[1].trim(),
    '**Contact number:** ' + contactNumber,
    '',
    '**Source:** [MSU-GenSan University Directory](' + DIRECTORY_URL + ').',
  ].join('\n');
}

function answerBriefSvpMethodQuestion() {
  return [
    '**Procurement method to examine: Small Value Procurement (SVP).**',
    '',
    'Consult Section 34 of the GPPB-approved Implementing Rules and Regulations of RA No. 12009. Section 34.1 sets the general ceiling at **₱2,000,000** for eligible Goods not available from PS-DBM, Infrastructure Projects, and Consulting Services; confirm the purchase category and applicable threshold before selecting SVP. Section 34.2 provides separate thresholds for LGUs.',
    '',
    '**Official rule:** [GPPB-approved IRR of RA No. 12009, Sections 34.1–34.3](https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf).',
    '',
    'For supplier eligibility documents specifically, consult [GPPB Circular No. 06-2026 (Annex A to Resolution No. 10-2026)](https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf), which supplements but does not replace Section 34.',
  ].join('\n');
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
    '**Supplementary supplier-document rules:** GPPB Circular No. 06-2026 (Annex A to Resolution No. 10-2026), Sections 4.2–4.7, sets documentary requirements for SVP suppliers, as applicable to the procurement type and ABC. It supplements the IRR; it does not replace Section 34’s method, threshold, quotation, or posting rules. [Official Circular No. 06-2026 / Resolution No. 10-2026 PDF](https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf).',
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

  if (isPmoDirectorContactQuestion(query)) {
    const contactAnswer = answerVerifiedPmoDirectorContact(chunks);
    if (contactAnswer) return contactAnswer;
  }

  // These specific legal intents fail closed: if the exact official evidence is
  // not retrieved, return a transparent evidence-gap response rather than asking
  // a generative model to fill the gap from memory or historical sources.
  if (isCircularResubmissionQuestion(query)) {
    return hasVerifiedCircularResubmissionEvidence(chunks)
      ? answerCircularResubmission()
      : answerEvidenceUnavailable('GPPB Circular No. 06-2026, Section 4.4', CIRCULAR_URL);
  }

  if (isNoSvpQuotationQuestion(query)) {
    return hasNoQuotationEvidence(chunks)
      ? answerNoSvpQuotation()
      : answerEvidenceUnavailable('GPPB-approved IRR of RA No. 12009, Section 34.3(d)', CURRENT_IRR_URL);
  }

  if (isSvpDocumentaryRequirementsQuestion(query)) {
    return hasVerifiedSvpDocumentaryEvidence(chunks) && hasVerifiedSvpProcedureEvidence(chunks)
      ? answerSvpDocumentaryRequirements()
      : answerSvpDocumentaryEvidenceUnavailable();
  }

  if (isSmallValueProcurementQuestion(query) && hasVerifiedSvpEvidence(chunks)) {
    if (isBriefSvpMethodQuestion(query)) return answerBriefSvpMethodQuestion();
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
  isBriefSvpMethodQuestion,
  isPmoDirectorContactQuestion,
  isHistoricalRa9184Question,
};
