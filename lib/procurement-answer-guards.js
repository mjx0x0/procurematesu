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
const TRANSITION_CIRCULAR_NAME = 'GPPB Circular No. 01-2025';
const TRANSITION_CIRCULAR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2025/10/GPPB-Resolution-No.-05-2025.pdf';

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

function isCircularProfessionalLicenseAmbiguityQuestion(query) {
  const asksAboutLicenseOrCv = /professional\s+license|curriculum vitae|\bCV\b/i.test(query);
  const asksAboutConsulting = /consulting(?:[- ]services?)?|highly technical consultants|take-over of contracts/i.test(query);
  const asksAboutTheConflict = /Section\s*4\.3\.3|Section\s*4\.7|inconsisten(?:t|cy)|required for every|mandatory|compare/i.test(query);
  return isSmallValueProcurementQuestion(query)
    && asksAboutLicenseOrCv
    && asksAboutConsulting
    && asksAboutTheConflict;
}

function isCircularResubmissionQuestion(query) {
  return /\b(?:resubmit(?:ting)?|re-submi(?:t|tting)|re-submission|submit again|resubmission)\b/i.test(query)
    && /\b(?:documents?|requirements?|already submitted|updated file|valid|up to date|current)\b/i.test(query);
}

function isNoSvpQuotationQuestion(query) {
  return isSmallValueProcurementQuestion(query)
    && /\b(?:no|zero)\s+(?:(?:price|supplier)\s+)?quotations?\b|\b(?:receives?|received|gets?|got)\s+no\s+(?:(?:price|supplier)\s+)?quotations?\b/i.test(query);
}

function isLiveWebSearchCapabilityQuestion(query) {
  const asksCapability = /\b(?:can|could|are you able to|do you have|does this chatbot|can this chatbot)\b/i.test(query);
  const mentionsSearch = /\b(?:search|browse|look up|access)\b/i.test(query);
  const mentionsInternet = /\b(?:internet|web|online)\b/i.test(query);
  const asksLiveSearchDirectly = /\b(?:live|real[- ]time)\s+(?:internet|web)\s+(?:search|browsing)\b/i.test(query)
    || /\bweb browsing\b/i.test(query);
  return (asksCapability && mentionsSearch && mentionsInternet) || asksLiveSearchDirectly;
}

function isUniversityChancellorIdentityQuestion(query) {
  return /\bchancellor\b/i.test(query)
    && /\b(?:who|name|current|msu|gensan|university|pr|purchase request|approving authority|approver|approved by|form)\b/i.test(query);
}

function officialCircularChunks(chunks) {
  return chunks.filter((chunk) => {
    if (documentName(chunk) !== CIRCULAR_NAME) return false;
    const metadata = chunk?.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {};
    return typeof metadata.source_url === 'string'
      && metadata.source_url.replace(/\/$/, '') === CIRCULAR_URL;
  });
}

function hasVerifiedUniversityChancellorEvidence(chunks) {
  const officialDirectoryChunks = chunks.filter((chunk) => {
    if (documentName(chunk) !== DIRECTORY_NAME) return false;
    const metadata = chunk?.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {};
    const sourceUrl = typeof metadata.source_url === 'string' ? metadata.source_url : '';
    return /^https:\/\/msugensan\.edu\.ph\/about\/university-directory\/?$/i.test(sourceUrl);
  });
  const text = joinedText(officialDirectoryChunks);
  return /University Chancellor/i.test(text)
    && /Atty\.\s*Shidik T\.\s*Abantas,\s*MDM,\s*LLM/i.test(text);
}

function answerLiveWebSearchCapability() {
  return [
    'I can search the procurement documents indexed in ProcureMateSU’s knowledge base, but this chat does not have live internet-search capability. I have not performed a live web search.',
    '',
    'For current official procurement information, check the [Government Procurement Policy Board (GPPB)](https://www.gppb.gov.ph/) and [PhilGEPS](https://philgeps.gov.ph/). For current MSU-GenSan officials, use the [official University Officials directory](https://msugensan.edu.ph/about/university-officials/).',
    '',
    'Tell me what information you need, and I can check the indexed knowledge base and identify any detail it cannot verify.',
  ].join('\n');
}

function answerVerifiedUniversityChancellor() {
  return [
    'The official MSU-GenSan University Officials directory lists **Atty. Shidik T. Abantas, MDM, LLM** as the **University Chancellor**.',
    '',
    'ProcureMateSU’s Purchase Request form currently displays this same name in the “Approved By” field with the designation “Chancellor.” This identifies the approving official shown by the form; it does not itself mean that a PR has been approved. The request must still follow the university’s prescribed review and approval process.',
    '',
    '**Official source:** [MSU-GenSan University Officials](' + DIRECTORY_URL + ').',
  ].join('\n');
}

function answerUniversityChancellorEvidenceUnavailable() {
  return [
    'I could not verify the current Chancellor’s name from an official university-directory excerpt retrieved for this question, so I will not guess.',
    '',
    'Please confirm the current listing in the [official MSU-GenSan University Officials directory](' + 'https://msugensan.edu.ph/about/university-officials/' + ').',
  ].join('\n');
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
    && /Section\s*4\.3\.1\(b\)/i.test(text)
    && /PhilGEPS Red Membership/i.test(text)
    && /Merchant Details/i.test(text)
    && /Section\s*4\.4/i.test(text)
    && /updated file/i.test(text)
    && /(?:re-?submission|resubmitted)/i.test(text)
    && /PhilGEPS Organization ID/i.test(text)
    && /Mayor.?s Permit/i.test(text)
    && /Professional License\s*\/?\s*CV/i.test(text)
    && /Section\s*4\.3\.3/i.test(text)
    && /Take-over of Contracts/i.test(text)
    && /Highly Technical Consultants/i.test(text)
    && /PCAB License/i.test(text)
    && /Income(?:\/| or )Business Tax Return/i.test(text)
    && /Omnibus Sworn Statement/i.test(text)
    && /above PHP 50,000/i.test(text);
}

function hasVerifiedCircularProfessionalLicenseAmbiguityEvidence(chunks) {
  const text = joinedText(officialCircularChunks(chunks));
  return /Section\s*4\.3\.3/i.test(text)
    && /Professional License|Curriculum Vitae/i.test(text)
    && /Take-over of Contracts/i.test(text)
    && /Highly Technical Consultants/i.test(text)
    && /Section\s*4\.7/i.test(text)
    && /Professional License\s*\/?\s*CV/i.test(text);
}

function hasNoQuotationEvidence(chunks) {
  const text = joinedText(chunks.filter((chunk) => documentName(chunk) === CURRENT_IRR_NAME));
  // Retrieved PDF chunks may split Section 34.3(d) among several rows, and
  // relevance ranking can reorder those rows. Check each operative element
  // independently after confirming that every excerpt is from the exact
  // current-IRR document, instead of requiring one contiguous sentence.
  return /in case no price quotation is received from (?:the )?suppliers/i.test(text)
    && /may extend the deadline/i.test(text)
    && /at least a single price quotation/i.test(text)
    && /extension shall not go beyond[^.]{0,100}corresponding appropriations/i.test(text);
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

function answerCircularProfessionalLicenseAmbiguity() {
  return [
    '## Professional License/CV for SVP consulting services',
    '',
    '**The Circular does not clearly resolve this point.** Section 4.7’s SVP documentary matrix marks Professional License/CV for consulting services. However, Section 4.3.3 describes the Professional License or Curriculum Vitae requirement in relation to consulting services procured through **Take-over of Contracts or Highly Technical Consultants**.',
    '',
    'These provisions appear inconsistent if the Section 4.7 matrix is read as requiring the document for every SVP consulting procurement. The text should not be presented as an unequivocal, universal requirement. This is not a conclusion that the document can never be required; the applicability depends on authoritative interpretation and the procurement circumstances.',
    '',
    '**Recommended action:** Before treating the document as mandatory for every SVP consulting procurement, the BAC/procurement office should seek authoritative GPPB clarification and document the clarification or approved interpretation in its procurement file. Do not silently choose one provision or invent a broader eligibility requirement.',
    '',
    '**Official source:** [GPPB Circular No. 06-2026 (Annex A to Resolution No. 10-2026), Sections 4.3.3 and 4.7](' + CIRCULAR_URL + ').',
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
    '- **PhilGEPS Organization ID or Certificate of Registration (Platinum Membership):** the procuring entity must ensure the supplier’s membership is not suspended. Under Section 4.3.1(b), where the procuring entity accepts PhilGEPS Red Membership, the supplier may submit a printed copy of the Merchant Details from PhilGEPS corresponding to its PhilGEPS Organization ID.',
    '- **Mayor’s Permit or Business Registration Permit.** An expired Mayor’s Permit with the official receipt for its renewal application is accepted, subject to submission of the valid permit after contract award but before payment. Where permitted by Section 4.3.2(b), a PhilGEPS Platinum Certificate may be used in lieu of the specified permit or Organization ID.',
    '- **Professional License/CV for consulting services — clarification required:** Section 4.7’s SVP matrix marks this item, but Section 4.3.3 describes the Professional License or Curriculum Vitae requirement for consulting services procured through Take-over of Contracts or Highly Technical Consultants. These provisions appear inconsistent as applied to SVP. Do not present the document as an unequivocal requirement for every SVP consulting procurement; seek authoritative GPPB clarification before requiring it on that basis.',
    '- **PCAB License and registration:** for infrastructure projects; a Special PCAB License applies in the case of a joint venture.',
    '- **Income or Business Tax Return:** when the ABC exceeds ₱500,000.',
    '- **Omnibus Sworn Statement (OSS):** when the ABC exceeds ₱50,000.',
    '',
    'Under Section 4.2, the BAC must state in the RFQ/RFP when the applicable documents are to be submitted: with the offer, during evaluation, or before issuance of the Notice of Award. Do not add other eligibility documents solely under this circular; its Section 3.5 list is exclusive.',
    '- **Resubmission rule (Section 4.4):** If the Procuring Entity already maintains an updated file of any applicable requirement through the PhilGEPS Certificate of Registration or its own records, it may no longer require that requirement to be resubmitted.',
    '',
    '**Separate substantive procedure under Section 34 of the IRR:**',
    '- **Section 34.1 — Threshold and quotations:** The general threshold is up to ₱2,000,000 for eligible Goods not available from PS-DBM, Infrastructure Projects, and Consulting Services. Receipt of one quotation is enough to proceed with evaluation only within the applicable threshold; it does not waive the requirement to request at least three quotations or mean the contract is automatically awarded.',
    '- **Section 34.3(a) — End-user request:** The End-User or Implementing Unit submits a request for SVP to the BAC stating the Technical Specifications, Scope of Work, Terms of Reference as applicable, ABC, and other terms and conditions.',
    '- **Section 34.3(b) — Posting:** The RFQ/RFP is posted for three calendar days on PhilGEPS, the procuring entity’s website if available, and a conspicuous place at its premises, except when the ABC is ₱200,000 or below.',
    '- **Section 34.3(c) — Quotations; Section 34.3(d) — No-response contingency:** The BAC sends RFQs/RFPs to at least three suppliers, contractors, or consultants of known qualifications, and also allows those responding to a required posting to participate. If no quotation is received, the entity may extend the deadline until at least one quotation is received, but not beyond the validity of the corresponding appropriations.',
    '- **Section 34.3(f)–(g) — Evaluation record and award:** After the deadline, prepare an Abstract of Quotations or Ratings listing respondents and their quotations/ratings. The BAC recommends to the HoPE an award in favor of the supplier, contractor, or consultant with the applicable LCRB, MEARB, MARB, or HRRB.',
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

function isCurrentLawStatusQuestion(query) {
  const mentionsFormerLaw = /\bra\s*\.?\s*9184\b|\b9184\b/i.test(query);
  const asksCurrentStatus = /\b(?:current|currently|still|in force|governing|applicable|applies|apply|procurement law|which law|what law)\b/i.test(query);
  return mentionsFormerLaw && asksCurrentStatus && !isHistoricalRa9184Question(query);
}

function hasVerifiedCurrentLawTransitionEvidence(chunks) {
  const officialChunks = chunks.filter((chunk) => {
    if (documentName(chunk) !== TRANSITION_CIRCULAR_NAME) return false;
    const metadata = chunk?.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {};
    const sourceUrl = typeof metadata.source_url === 'string' ? metadata.source_url.replace(/\/$/, '') : '';
    return sourceUrl === TRANSITION_CIRCULAR_URL;
  });
  const text = joinedText(officialChunks);
  return officialChunks.length > 0
    && /State Universities and Colleges/i.test(text)
    && /Section\s*115/i.test(text)
    && /expressly repeal(?:ed|s) RA No\.?\s*9184/i.test(text)
    && /Section\s*5\.1/i.test(text)
    && /(?:prior to|published before) the effectivity of the IRR of RA No\.?\s*12009/i.test(text)
    && /Section\s*5\.2\.1/i.test(text)
    && /until the necessary guidelines, forms and requirements/i.test(text)
    && /15 May 2028/i.test(text);
}

function answerCurrentLawStatus() {
  return [
    '## Is RA No. 9184 still the current procurement law for MSU-GenSan?',
    '',
    '**No—not as the general governing law for new procurement activities.** RA No. 12009 (the New Government Procurement Act) and its GPPB-approved IRR are in effect. Section 115 of RA No. 12009 expressly repealed RA No. 9184.',
    '',
    '**Important transition rules for SUCs:** GPPB Circular No. 01-2025 expressly applies to State Universities and Colleges (Section 2.1). Under Section 5.1, RA No. 9184 and its 2016 IRR remain applicable to procurement projects published before the RA No. 12009 IRR took effect on **25 February 2025**. Separately, Section 5.2.1 allows procuring entities to continue using particular guidelines and forms issued under RA No. 9184 until the relevant replacement guidelines, forms, and requirements under RA No. 12009 and its IRR have been issued. That limited transition does **not** mean RA No. 9184 remains the general law for all new procurements.',
    '',
    'The three-year period for full compliance with RA No. 12009 and its IRR was reckoned from approval of the new Standard Procurement Forms on **14 May 2025**, with the Circular identifying **15 May 2028** as the compliance deadline (Section 5.4). The transition period is not a blanket continuation of RA No. 9184 for every new procurement.',
    '',
    '**Source-status caution:** Use only the IRR approved under GPPB Resolution No. 02-2025. GPPB Public Advisory No. 09-2026 says the separate IRR edition dated 31 March 2026 was withdrawn and should no longer be used.',
    '',
    '**Official sources:** [GPPB Circular No. 01-2025 / Resolution No. 05-2025, Sections 2.1, 4.2, 5.1, 5.2.1 and 5.4](' + TRANSITION_CIRCULAR_URL + '); [GPPB-approved IRR of RA No. 12009, Resolution No. 02-2025](' + CURRENT_IRR_URL + '); [GPPB Public Advisory No. 09-2026](https://www.gppb.gov.ph/public-advisory-no-09-2026/).'
  ].join('\n');
}

function isDraftToStepOneQuestion(query) {
  const mentionsDraft = /\bdraft\b/i.test(query);
  const mentionsStepOne = /\bstep\s*1\b/i.test(query);
  const asksTransition = /\b(?:when|move|moves|moving|advance|advances|transition|transitions|change|changes|from|until|before|after|receipt|received)\b/i.test(query);
  const mentionsPR = /\bpurchase request\b|\bPR\b/i.test(query);
  return mentionsDraft && mentionsStepOne && asksTransition && mentionsPR;
}

function answerDraftToStepOne() {
  return [
    '**A newly created Purchase Request stays in Draft until the Procurement Office receives the required printed PR form and confirms receipt in ProcureMateSU.** Only after that receipt is confirmed in the system should the PR move from **Draft** to **Step 1 — Receipt of Purchase Request**.',
    '',
    'Creating or saving the PR online does not by itself move it to Step 1. This is ProcureMateSU’s configured workflow rule; it is distinct from the general procurement requirements in RA No. 12009.',
    '',
    '**Source:** ProcureMateSU system workflow rule (printed-form receipt must be confirmed by the Procurement Office before the Draft-to-Step-1 transition).'
  ].join('\n');
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
  const refersToMSUOrPMO = /\bmsu\b|\bgensan\b|mindanao state university|procurement management office|\bPMO\b/i.test(query);
  const refersToPR = /\bpurchase requests?\b|\bPR\b/i.test(query);
  const asksAboutSequence = /\b(?:after|sequence|workflow|process|steps|review|validation|budget clearance|approval|receives?|received|receipt|what happens)\b/i.test(query);
  return refersToMSUOrPMO && refersToPR && asksAboutSequence;
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
    '## What happens after the PMO receives a Purchase Request?',
    '',
    'The indexed **MSU-GenSan PMO Administrative Manual, Section IV (“Process Flow”), PDF page 12**, describes this internal sequence:',
    '',
    '1. **Receipt:** The PMO receives the duly accomplished PR from the end-user unit.',
    '2. **PPMP/APP verification:** The PMO checks the PR against the approved Project Procurement Management Plan (PPMP) and Annual Procurement Plan (APP).',
    '3. **PMO Director validation:** The PR is forwarded to the PMO Director for review, validation, and signature to certify completeness and compliance.',
    '4. **Pre-numbering and control:** The validated PR receives a control number and is entered in the procurement tracking log.',
    '5. **Budget clearance:** The controlled PR is endorsed to the Budget Management Office for fund-availability confirmation and obligation clearance.',
    '6. **Approval:** The PMO receives the approved PR signed by the Chancellor or an authorized approving authority.',
    '7. **RFQ generation:** The PMO generates RFQs from approved PRs, including complete technical specifications and the approved ABC.',
    '',
    'The manual lists these as separate sequential stages. RFQs and Abstracts of Quotations are later procurement documents, not documents that the cited sequence says must all exist before the PMO can receive a PR.',
    '',
    '**Source qualification:** The knowledge base identifies this as the PMO Administrative Manual, Section IV, PDF page 12. The manual’s version and approval status are not independently verified in the indexed metadata, so confirm any disputed office-specific instruction with the PMO. This internal sequence does not replace the requirements of RA No. 12009, its applicable IRR, or current GPPB issuances.'
  ].join('\n');
}

/**
 * @param {string} query
 * @param {Array<{document_name?: string, chunk_text?: string}>} chunks
 * @returns {string|null}
 */
function buildVerifiedProcurementAnswer(query, chunks) {
  if (!Array.isArray(chunks)) return null;

  if (isLiveWebSearchCapabilityQuestion(query)) {
    return answerLiveWebSearchCapability();
  }

  if (isUniversityChancellorIdentityQuestion(query)) {
    return hasVerifiedUniversityChancellorEvidence(chunks)
      ? answerVerifiedUniversityChancellor()
      : answerUniversityChancellorEvidenceUnavailable();
  }

  // Application-specific transition: do not ask a generative model to infer this rule.
  if (isDraftToStepOneQuestion(query)) {
    return answerDraftToStepOne();
  }

  // Current-law questions require the official GPPB circular on repeal and transition.
  if (isCurrentLawStatusQuestion(query)) {
    return hasVerifiedCurrentLawTransitionEvidence(chunks)
      ? answerCurrentLawStatus()
      : answerEvidenceUnavailable('GPPB Circular No. 01-2025, policy guidance on Sections 113 and 115 of RA No. 12009', TRANSITION_CIRCULAR_URL);
  }

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

  if (isCircularProfessionalLicenseAmbiguityQuestion(query)) {
    return hasVerifiedCircularProfessionalLicenseAmbiguityEvidence(chunks)
      ? answerCircularProfessionalLicenseAmbiguity()
      : answerEvidenceUnavailable('GPPB Circular No. 06-2026, Sections 4.3.3 and 4.7', CIRCULAR_URL);
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
