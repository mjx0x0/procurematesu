'use strict';

const CURRENT_IRR_NAME = 'Implementing Rules and Regulations of RA 12009';
const CURRENT_IRR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf';
const RA_12009_URL = 'https://lawphil.net/statutes/repacts/ra2024/ra_12009_2024.html';
const CIRCULAR_NAME = 'GPPB Circular No. 06-2026';
const CIRCULAR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf';
const TRANSITION_CIRCULAR_NAME = 'GPPB Circular No. 01-2025';
const TRANSITION_CIRCULAR_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2025/10/GPPB-Resolution-No.-05-2025.pdf';
const PMO_MANUAL_NAME = 'PMO Administrative Manual';
const WORKFLOW_NAME = 'ProcureMateSU System Workflow';

function textOf(chunk) {
  return typeof chunk?.chunk_text === 'string' ? chunk.chunk_text : '';
}
function nameOf(chunk) {
  return typeof chunk?.document_name === 'string' ? chunk.document_name.trim() : '';
}
function metadataOf(chunk) {
  return chunk?.metadata && typeof chunk.metadata === 'object' && !Array.isArray(chunk.metadata) ? chunk.metadata : {};
}
function joined(chunks) {
  return chunks.map(textOf).join('\n\n').replace(/\s+/g, ' ');
}
function currentIrrChunks(chunks) {
  return chunks.filter((chunk) => {
    if (nameOf(chunk) !== CURRENT_IRR_NAME) return false;
    const url = typeof metadataOf(chunk).source_url === 'string' ? metadataOf(chunk).source_url.replace(/\/$/, '') : '';
    return !url || url === CURRENT_IRR_URL;
  });
}
function pmoChunks(chunks) {
  return chunks.filter((chunk) => nameOf(chunk) === PMO_MANUAL_NAME);
}
function officialCircularChunks(chunks) {
  return chunks.filter((chunk) => {
    if (nameOf(chunk) !== CIRCULAR_NAME) return false;
    const url = typeof metadataOf(chunk).source_url === 'string' ? metadataOf(chunk).source_url.replace(/\/$/, '') : '';
    return url === CIRCULAR_URL;
  });
}
function evidenceGap(source, detail) {
  return [
    'I can’t verify this detail from the authoritative source excerpts retrieved for this question, so I will not guess or rely on a historical procurement manual.',
    detail || '',
    source ? '**Source to check:** ' + source : '',
  ].filter(Boolean).join('\n\n');
}

function isCurrentGoverningProcurementLawQuestion(q) {
  return /\b(?:what|which)\s+(?:is\s+)?(?:the\s+)?(?:current|currently applicable|governing|applicable)?\s*procurement law\b/i.test(q)
    || /\bwhat law currently governs\b/i.test(q)
    || /\bwhich law governs (?:government )?procurement\b/i.test(q);
}
function isRa12009TitleQuestion(q) {
  return /\b(?:what is|what does|identify|give me)\b/i.test(q)
    && /\b(?:RA\s*\.?\s*(?:No\.?\s*)?12009|Republic Act\s+No\.?\s*12009|New Government Procurement Act)\b/i.test(q)
    && !/\b(?:threshold|section|posting|quotation|amendment|penalty|procedure|requirement|specific provision)\b/i.test(q);
}
function isBacFunctionsQuestion(q) {
  return /\b(?:BAC|Bids and Awards Committee)\b/i.test(q)
    && /\b(?:function|responsibilit|role|dut(?:y|ies)|what does)\b/i.test(q);
}
function isPpmpAppComparison(q) {
  return /\bPPMP\b/i.test(q) && /\bAPP\b|Annual Procurement Plan/i.test(q)
    && /\b(?:difference|differ|compare|versus|vs\.?|between|distinguish)\b/i.test(q);
}
function isPpmpDefinition(q) {
  return /\bPPMP\b|Project Procurement Management Plan/i.test(q)
    && /\b(?:what is|define|definition|meaning)\b/i.test(q)
    && !/\bAPP\b|Annual Procurement Plan/i.test(q);
}
function isPrDefinition(q) {
  return /\b(?:what is|define|definition|meaning)\b/i.test(q)
    && /\b(?:Purchase Request|\bPR\b)\b/i.test(q);
}
function isPoDefinition(q) {
  return /\b(?:what is|define|definition|meaning)\b/i.test(q)
    && /\b(?:Purchase Order|\bPO\b)\b/i.test(q);
}
function isPrWorkflowQuestion(q) {
  return /\b(?:Purchase Request|\bPR\b)\b/i.test(q)
    && /\b(?:after|once|when|sequence|workflow|process|steps|what happens|prepared|prepares|receives|received)\b/i.test(q);
}
function isPrNumberAssignmentQuestion(q) {
  return /\b(?:who|which office|what office)\b/i.test(q)
    && /\b(?:assign|records?|issues?)\b/i.test(q)
    && /\b(?:official )?PR (?:number|no\.?)\b/i.test(q);
}
function isTemporaryOfficeLocationQuestion(q) {
  return /\b(?:where|location|located|address)\b/i.test(q)
    && /\b(?:procurement office|procurement management office|PMO)\b/i.test(q)
    && /\b(?:temporary|temporarily|current|currently|office)\b/i.test(q);
}
function isPrApprovalTimeLimitQuestion(q) {
  return /\b(?:exact|specific|maximum|standard|internal)?\s*(?:approval|processing|turnaround)\s*(?:time|period|deadline|limit|duration|days?)\b/i.test(q)
    && /\b(?:PR|purchase request)\b/i.test(q);
}
function isSvpCompetitiveComparison(q, context = '') {
  const combined = q + '\n' + context;
  return /\b(?:SVP|Small Value Procurement)\b/i.test(combined)
    && /\bCompetitive Bidding\b/i.test(combined)
    && (/\b(?:differ|difference|compare|versus|vs\.?|simpler|simple|Tagalog|Taglish|paliwanag|ipaliwanag)\b/i.test(q)
      || /\b(?:difference|differ|compare|versus|vs\.?)\b/i.test(combined));
}
function isLowestQuotationAwardQuestion(q) {
  return /\b(?:lowest|cheapest|lowest[- ]priced)\b/i.test(q)
    && /\b(?:quotation|quote|supplier|bid)\b/i.test(q)
    && /\b(?:win|award|awarded|guarantee|definitely|automatic|automatically)\b/i.test(q);
}
function isCircular06CoverageQuestion(q) {
  return /\b(?:what does|what is covered by|coverage|cover)\b/i.test(q)
    && /\b(?:GPPB\s+)?Circular\s+No\.?\s*06[-–]2026\b/i.test(q);
}

function hasCurrentGoverningLawEvidence(chunks) {
  const hasShortTitle = hasRa12009ShortTitleEvidence(chunks);
  const transition = chunks.filter((chunk) => {
    if (nameOf(chunk) !== TRANSITION_CIRCULAR_NAME) return false;
    const url = typeof metadataOf(chunk).source_url === 'string' ? metadataOf(chunk).source_url.replace(/\/$/, '') : '';
    return url === TRANSITION_CIRCULAR_URL;
  });
  const t = joined(transition);
  return hasShortTitle
    && /Section\s*4\.2/i.test(t)
    && /RA No\.?\s*12009 expressly repealed RA No\.?\s*9184/i.test(t)
    && /Section\s*5\.1/i.test(t)
    && /published before the effectivity of the IRR of RA No\.?\s*12009/i.test(t)
    && /25 February 2025/i.test(t);
}
function hasRa12009ShortTitleEvidence(chunks) {
  const candidates = chunks.filter((chunk) => {
    const n = nameOf(chunk);
    if (!/^RA 12009(?: \(New\))?$/i.test(n) && !/^Republic Act No\.? 12009$/i.test(n)) return false;
    if (/Local Government Units Procurement Manual|2014/i.test(textOf(chunk))) return false;
    return true;
  });
  const t = joined(candidates);
  return /Section\s*1\.\s*Short Title/i.test(t)
    && /This Act shall be known as the ["“]?New Government Procurement Act["”]?/i.test(t);
}
function hasBacFunctionsEvidence(chunks) {
  const t = joined(currentIrrChunks(chunks));
  return /Section\s*42\.\s*Functions of the BAC/i.test(t)
    && /Recommend to the HoPE/i.test(t)
    && /Conduct pre-procurement and pre-bid conferences/i.test(t)
    && /Determine the eligibility of prospective bidders/i.test(t)
    && /Receive and open bids/i.test(t)
    && /Conduct the evaluation of bids/i.test(t)
    && /Undertake post-qualification proceedings/i.test(t)
    && /Recommend award of contracts to the HoPE/i.test(t);
}
function hasPpmpAppEvidence(chunks) {
  const t = joined(currentIrrChunks(chunks));
  return /7\.7\.1/.test(t) && /Project Procurement Management Plans \(PPMPs?\)/i.test(t)
    && /7\.7\.2/.test(t) && /BAC Secretariat for consolidation into an Indicative APP/i.test(t)
    && /7\.7\.5/.test(t) && /consolidation into the final APP/i.test(t);
}
function hasPmoPrEvidence(chunks) {
  const t = joined(pmoChunks(chunks));
  return /Purchase Requests?/i.test(t) && /completeness|correctness|validation/i.test(t)
    && /specifications/i.test(t) && /quantities/i.test(t) && /unit costs?|total amounts?|estimated costs?/i.test(t);
}
function hasPmoPoEvidence(chunks) {
  const t = joined(pmoChunks(chunks));
  return /Purchase Order|\bPO\b/i.test(t) && /awarded supplier|awarded bidder/i.test(t)
    && /Budget Office/i.test(t) && /Accounting/i.test(t) && /Chancellor/i.test(t);
}
function hasPmoWorkflowEvidence(chunks) {
  const t = joined(pmoChunks(chunks));
  return /Receipt of Purchase Request/i.test(t)
    && /PPMP/i.test(t) && /\bAPP\b/i.test(t)
    && /PMO Director/i.test(t)
    && /Budget Management Office/i.test(t)
    && /Chancellor|authorized approving authority/i.test(t)
    && /Procurement Management Monitoring Section/i.test(t)
    && /control or reference number/i.test(t);
}
function hasPrNumberEvidence(chunks) {
  const workflow = chunks.filter((c) => nameOf(c) === WORKFLOW_NAME);
  const pmo = pmoChunks(chunks);
  const w = joined(workflow);
  const p = joined(pmo);
  return /Step\s*4/i.test(w) && /Pre-Numbering and Control of PRs/i.test(w)
    && /Procurement Management Office|PMO/i.test(w)
    && /Procurement Management Monitoring Section/i.test(p)
    && /formally assign a control or reference number/i.test(p);
}
function hasCurrentTemporaryLocationEvidence(chunks) {
  return chunks.some((chunk) => {
    const n = nameOf(chunk);
    const url = typeof metadataOf(chunk).source_url === 'string' ? metadataOf(chunk).source_url : '';
    const t = textOf(chunk);
    return /MSU.*(?:official )?(?:advisory|notice|announcement|bulletin)/i.test(n)
      && /^https:\/\/(?:www\.)?msugensan\.edu\.ph\//i.test(url)
      && /temporar(?:y|ily) located|temporary office location|relocated to/i.test(t)
      && /effective|until further notice|as of/i.test(t);
  });
}
function hasCurrentCompetitiveEvidence(chunks) {
  const t = joined(currentIrrChunks(chunks));
  return /Section\s*27\.\s*Competitive Bidding/i.test(t)
    && /open to participation by any eligible bidder/i.test(t)
    && /Publication/i.test(t) && /Pre-bid conference/i.test(t)
    && /Eligibility screening/i.test(t) && /Receipt and opening of bids/i.test(t)
    && /Evaluation of bids/i.test(t) && /Post-qualification/i.test(t)
    && /Section\s*34\.1/i.test(t) && /Two Million Pesos/i.test(t)
    && /Section\s*34\.2/i.test(t) && /case of LGUs/i.test(t)
    && /(?:Section\s*)?34\.3\s*\(\s*b\s*\)/i.test(t);
}
function hasLowestQuotationEvidence(chunks) {
  const t = joined(currentIrrChunks(chunks));
  return /34\.3\(f\)/i.test(t) && /Abstract of Quotations or Ratings/i.test(t)
    && /34\.3\(g\)/i.test(t) && /LCRB/i.test(t)
    && /MEARB/i.test(t) && /MARB/i.test(t) && /HRRB/i.test(t);
}
function hasCircularCoverageEvidence(chunks) {
  const t = joined(officialCircularChunks(chunks));
  return /Section\s*3\.2/i.test(t) && /Section\s*3\.5/i.test(t)
    && /Section\s*4\.2/i.test(t) && /Section\s*4\.7/i.test(t);
}

function answerCurrentGoverningProcurementLaw() {
  return [
    'For new government procurement, the governing statute is **Republic Act No. 12009, the New Government Procurement Act (NGPA)**, together with its GPPB-approved Implementing Rules and Regulations.',
    '',
    'RA No. 12009 expressly repealed RA No. 9184. There is a limited transition rule: under GPPB Circular No. 01-2025, RA No. 9184 and its 2016 IRR continue to apply to procurement projects published before the RA No. 12009 IRR took effect on 25 February 2025. That transition does not make RA No. 9184 the general governing law for new procurement.',
    '',
    '**Official sources:** [RA No. 12009, Section 1](' + RA_12009_URL + '); [GPPB Circular No. 01-2025, Sections 4.2 and 5.1](' + TRANSITION_CIRCULAR_URL + '); [GPPB-approved IRR](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}
function answerRa12009Title() {
  return [
    'Republic Act No. 12009 is the **New Government Procurement Act (NGPA)**.',
    '',
    'The distinction matters: the Act’s long title says it revises RA No. 9184, which was otherwise known as the “Government Procurement Reform Act.” That historical title belongs to RA No. 9184. Section 1 of RA No. 12009 gives the new Act’s short title as the “New Government Procurement Act.”',
    '',
    '**Source:** RA No. 12009, Section 1. [Official text on LawPhil](' + RA_12009_URL + ').',
  ].join('\n');
}
function answerBacFunctions() {
  return [
    'Under **Section 42.1 of the IRR of RA No. 12009**, the BAC’s functions include:',
    '',
    '1. Recommend to the Head of the Procuring Entity (HoPE) the appropriate procurement mode.',
    '2. Publish or post the Invitation to Bid or Request for Expressions of Interest.',
    '3. Conduct pre-procurement and pre-bid conferences.',
    '4. Determine the eligibility of prospective bidders; receive and open bids; and evaluate bids.',
    '5. Undertake post-qualification proceedings and resolve requests for reconsideration.',
    '6. Recommend contract award to the HoPE or authorized representative.',
    '7. Recommend sanctions when warranted and prepare the procurement monitoring report for the HoPE’s approval and submission to the GPPB.',
    '',
    'The **BAC Secretariat is a separate support unit**. Its administrative and documentation duties should not be described as BAC functions. The BAC makes the recommendations and performs the procurement functions assigned by the IRR; the HoPE acts on the award recommendation.',
    '',
    '**Source:** IRR of RA No. 12009, Section 42.1. [GPPB-approved IRR](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}
function answerPpmpAppComparison() {
  return [
    '**PPMP:** Each End-User or Implementing Unit prepares a Project Procurement Management Plan for its programs, activities, and projects. Under Section 7.7.1, it identifies whether procurement is needed, the project type and objective, quantity or size, procurement mode, schedule, estimated contract budget, and technical specifications, scope of work, or terms of reference.',
    '',
    '**APP:** The Annual Procurement Plan is the Procuring Entity’s consolidated plan. Under Sections 7.7.2 and 7.7.5, the approved Indicative PPMPs are consolidated by the BAC Secretariat into the Indicative APP; after the budget becomes final, the finalized PPMPs are consolidated into the final APP. The BAC recommends the final APP for approval by the HoPE.',
    '',
    '**In short:** PPMP = unit/project-level procurement plan. APP = consolidated Procuring Entity-wide annual procurement plan. Procurement must follow the approved Indicative APP or final APP, as applicable (Section 7.8).',
    '',
    '**Source:** IRR of RA No. 12009, Sections 7.7.1–7.7.5 and 7.8. [GPPB-approved IRR](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}
function answerPpmpDefinition() {
  return [
    'A **Project Procurement Management Plan (PPMP)** is the plan prepared by an End-User or Implementing Unit for its programs, activities, and projects. It identifies the procurement requirements and planning details for each project.',
    '',
    'Under Section 7.7.1 of the IRR of RA No. 12009, the PPMP includes the project type and objective, quantity or size, procurement mode, schedule, estimated contract budget, and applicable technical specifications, scope of work, or terms of reference.',
    '',
    'The PPMPs are later consolidated into the Procuring Entity’s Indicative APP and final APP under Sections 7.7.2 and 7.7.5.',
    '',
    '**Source:** IRR of RA No. 12009, Sections 7.7.1–7.7.5. [GPPB-approved IRR](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}
function answerPrDefinition() {
  return [
    'A **Purchase Request (PR)** is the end-user unit’s formal request to initiate the procurement of needed goods, infrastructure works, or consulting services. It records the requirement and the details needed for review, such as the purpose, item descriptions, specifications, quantities, and estimated costs.',
    '',
    'The MSU-GenSan PMO Administrative Manual describes the PR as a document checked for completeness and correctness and reviewed for consistency with procurement plans and the details later carried into RFQs. An approved PR is the basis for the PMO’s subsequent procurement-document preparation.',
    '',
    '**Source qualification:** This description of MSU’s internal handling is based on the indexed PMO Administrative Manual. Its approval/version status is not independently verified in the retrieved metadata; confirm current university-specific requirements with the PMO.',
  ].join('\n');
}
function answerPoDefinition() {
  return [
    'A **Purchase Order (PO)** is a controlled procurement document issued to the supplier after the procurement has resulted in an award. It records the purchase being placed and the applicable details and terms.',
    '',
    'The indexed MSU-GenSan PMO Administrative Manual describes the PO as issued to the awarded supplier or bidder. It also lists Budget Office and Accounting signatures and Chancellor approval in its definition. Because the manual’s approval/version status is not independently verified, treat that signatory sequence as internal guidance to confirm with the PMO—not as a universal statutory rule.',
  ].join('\n');
}
function answerPmoWorkflow() {
  return [
    'The indexed MSU-GenSan PMO Administrative Manual describes this internal sequence after an end-user prepares a PR:',
    '',
    '1. The PR is submitted to the Procurement Management Office (PMO).',
    '2. The PMO checks the PR for completeness and consistency with the approved PPMP and APP.',
    '3. The PR is forwarded to the PMO Director for validation.',
    '4. The PMO Monitoring Section records the control/reference number for tracking.',
    '5. The PR is endorsed to the Budget Management Office for fund-availability clearance.',
    '6. The PMO receives the PR after approval by the Chancellor or authorized approving authority.',
    '7. The PMO prepares the applicable procurement documents, such as an RFQ, based on the approved PR.',
    '',
    'This is the sequence described in the university’s internal manual, not a substitute for RA No. 12009 or its IRR. The indexed manual’s approval/version status is not independently verified, so confirm any disputed or recently changed step with the Procurement Office. The separate 2014 Local Government Units Procurement Manual must not be used to add RIS or Shopping steps to MSU’s process.',
    '',
    '**Source:** MSU-GenSan PMO Administrative Manual, Sections IV and B.2–B.3 (as identified in the indexed excerpts; no verified public link is available).',
  ].join('\n');
}
function answerPrNumber() {
  return [
    'In the ProcureMateSU workflow, the official PR number is recorded at **Step 4 — Pre-Numbering and Control of PRs** by the Procurement Management Office.',
    '',
    'The MSU-GenSan PMO Administrative Manual assigns the formal control/reference-number function to the **Procurement Management Monitoring Section**. The temporary tracking identifier used before Step 4 is not the official PR number.',
    '',
    '**Source qualification:** This answer combines the ProcureMateSU workflow rule with the internal PMO Manual’s description of the Monitoring Section. The manual’s current approval/version status should be confirmed with the PMO.',
  ].join('\n');
}
function answerTemporaryLocationUnavailable() {
  return [
    'I can’t verify the Procurement Office’s current temporary location from a current official MSU-GenSan advisory retrieved for this question. I will not assume that a previously reported location is still current.',
    '',
    'Please confirm the current location through the official MSU-GenSan website or directly with the Procurement Management Office before visiting.',
  ].join('\n');
}
function answerPrApprovalTimeLimit(chunks) {
  const t = joined(pmoChunks(chunks));
  const match = t.split(/(?<=[.!?])\s+/).find((sentence) =>
    /(?:Purchase Request|\bPR\b)/i.test(sentence)
    && /(?:within|not later than|no more than|shall be completed within)\s+\d+\s+(?:working|calendar)\s+days/i.test(sentence)
  );
  if (match) {
    return 'The indexed PMO Administrative Manual states: “' + match[0].trim() + '.” Please confirm that this manual is the current approved version with the PMO before relying on the timeline.';
  }
  return [
    'The available indexed MSU-GenSan PMO Administrative Manual excerpts do **not establish an exact, universal internal approval time limit for every PR**. The workflow steps describe routing and review, but they do not specify a single number of working or calendar days for all PRs.',
    '',
    'I therefore cannot give an exact deadline. Please request the current approved service standard or Citizen’s Charter provision from the Procurement Management Office.',
  ].join('\n');
}
function answerSvpCompetitiveComparison(tagalog = false) {
  if (tagalog) {
    return [
      '**Pagkakaiba ng SVP at Competitive Bidding:**',
      '',
      '- **SVP (Section 34):** Para sa mga kwalipikadong procurement na pasok sa naaangkop na threshold. Para sa SUC gaya ng MSU-GenSan, ang general threshold sa Section 34.1 ay hindi lalampas sa ₱2,000,000, para lamang sa mga saklaw na Goods na hindi available sa PS-DBM, Infrastructure Projects, at Consulting Services. Iba ang threshold schedule para sa LGUs sa Section 34.2.',
      '- **Quotations:** Sa SVP, humihingi ang Procuring Entity ng hindi bababa sa tatlong quotation at nagpapadala ang BAC ng RFQ/RFP sa hindi bababa sa tatlong kwalipikadong supplier, contractor, o consultant. Hindi ibig sabihin na kailangang tatlo ang aktuwal na sumagot para makapag-evaluate; pinapayagan ang evaluation kapag may kahit isang quotation, kung natutugunan ang kondisyon.',
      '- **Posting:** Kung lampas ₱200,000 ang ABC, kailangang i-post ang RFQ/RFP nang tatlong calendar days sa mga venue na itinakda sa Section 34.3(b). Hindi kailangan ang posting kung ₱200,000 pababa ang ABC.',
      '- **Competitive Bidding (Section 27.1):** Bukas ito sa lahat ng eligible bidder at may pitong proseso: publication, pre-bid conference, eligibility screening, receipt and opening of bids, evaluation, post-qualification, at award.',
      '',
      'Sa madaling sabi, ang SVP ay quotation-based na paraan para sa mga pasok sa threshold; ang Competitive Bidding ay bukas na bidding process na sumusunod sa mas pormal na pitong yugto. Hindi dapat gamitin ang LGU-specific thresholds para sa MSU-GenSan dahil SUC ito.',
      '',
      '**Source:** IRR of RA No. 12009, Sections 27.1, 34.1–34.3. [GPPB-approved IRR](' + CURRENT_IRR_URL + ').',
    ].join('\n');
  }
  return [
    '**Small Value Procurement (SVP)** and **Competitive Bidding** are different procurement modes under the IRR of RA No. 12009.',
    '',
    '- **SVP — Section 34:** For MSU-GenSan as an SUC, the general threshold in Section 34.1 is an ABC not exceeding ₱2,000,000 for the covered procurement categories. Section 34.2 contains separate thresholds for LGUs and should not be applied to an SUC.',
    '- **SVP quotation process:** The Procuring Entity requests at least three quotations, and the BAC sends RFQs/RFPs to at least three qualified suppliers, contractors, or consultants. Receipt of one quotation may be enough to proceed with evaluation if the threshold condition is met; it does not guarantee award.',
    '- **SVP posting:** Under Section 34.3(b), the RFQ/RFP is posted for three calendar days, except when the ABC is ₱200,000 or below.',
    '- **Competitive Bidding — Section 27.1:** It is open to any eligible bidder and follows seven processes: publication, pre-bid conference, eligibility screening, receipt and opening of bids, bid evaluation, post-qualification, and award.',
    '',
    'In short, SVP is a quotation-based mode for procurements within its applicable threshold; Competitive Bidding is an open bidding process with the formal stages listed in Section 27.1. Do not use LGU-specific SVP thresholds for MSU-GenSan, which is an SUC.',
    '',
    '**Source:** IRR of RA No. 12009, Sections 27.1 and 34.1–34.3. [GPPB-approved IRR](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}
function answerLowestQuotation() {
  return [
    'No. The lowest-priced quotation does not automatically guarantee an award.',
    '',
    'Under **Section 34.3(f)–(g) of the IRR of RA No. 12009**, the BAC prepares an Abstract of Quotations or Ratings after the submission deadline and recommends award to the supplier, contractor, or consultant that meets the applicable award criterion: LCRB, MEARB, MARB, or HRRB, as determined for the procurement. The quotation must be evaluated against the stated requirements and criteria; price alone is not enough to establish an award.',
    '',
    '**Source:** IRR of RA No. 12009, Section 34.3(f)–(g). [GPPB-approved IRR](' + CURRENT_IRR_URL + ').',
  ].join('\n');
}
function answerCircularCoverage() {
  return [
    'GPPB Circular No. 06-2026 provides **supplementary documentary-requirement guidelines for specified procurement modes under RA No. 12009**. It explains the relevant eligibility documents, the applicable documentary matrix, and the stage at which documents are to be submitted as stated in the RFQ/RFP.',
    '',
    'It supplements the IRR; it does not replace the substantive procurement procedures or thresholds in the Act and IRR. In particular, the SVP threshold, quotation-request process, and posting rule are found in **IRR Section 34**, not created by Circular No. 06-2026.',
    '',
    '**Source:** GPPB Circular No. 06-2026, Sections 3.2, 3.5, 4.2 and 4.7. [Official Circular PDF](' + CIRCULAR_URL + ').',
  ].join('\n');
}

function isHighRiskProcurementQuestion(query, conversationContext = '') {
  const q = String(query || '').trim();
  const combined = q + '\n' + String(conversationContext || '');
  return isCurrentGoverningProcurementLawQuestion(q) || isRa12009TitleQuestion(q) || isBacFunctionsQuestion(q)
    || isPpmpAppComparison(q) || isPpmpDefinition(q)
    || isPrDefinition(q) || isPoDefinition(q)
    || isPrWorkflowQuestion(q) || isPrNumberAssignmentQuestion(q)
    || isTemporaryOfficeLocationQuestion(q) || isPrApprovalTimeLimitQuestion(q)
    || isSvpCompetitiveComparison(q, conversationContext)
    || isLowestQuotationAwardQuestion(q) || isCircular06CoverageQuestion(q);
}

function buildHighRiskProcurementResponse(query, chunks, conversationContext = '') {
  const q = String(query || '').trim();
  const combined = q + '\n' + String(conversationContext || '');
  const safeChunks = Array.isArray(chunks) ? chunks : [];

  if (isTemporaryOfficeLocationQuestion(q)) {
    if (!hasCurrentTemporaryLocationEvidence(safeChunks)) return answerTemporaryLocationUnavailable();
    const official = safeChunks.find((chunk) => {
      const n = nameOf(chunk);
      const url = typeof metadataOf(chunk).source_url === 'string' ? metadataOf(chunk).source_url : '';
      return /MSU.*(?:official )?(?:advisory|notice|announcement|bulletin)/i.test(n)
        && /^https:\/\/(?:www\.)?msugensan\.edu\.ph\//i.test(url);
    });
    return official ? textOf(official) + '\n\n**Source:** ' + metadataOf(official).source_url : answerTemporaryLocationUnavailable();
  }

  if (isPrApprovalTimeLimitQuestion(q)) return answerPrApprovalTimeLimit(safeChunks);

  if (isCurrentGoverningProcurementLawQuestion(q)) {
    return hasCurrentGoverningLawEvidence(safeChunks) ? answerCurrentGoverningProcurementLaw()
      : evidenceGap('RA No. 12009, Section 1; GPPB Circular No. 01-2025, Sections 4.2 and 5.1; and the GPPB-approved IRR.');
  }
  if (isRa12009TitleQuestion(q)) {
    return hasRa12009ShortTitleEvidence(safeChunks) ? answerRa12009Title()
      : evidenceGap('RA No. 12009, Section 1 (Short Title).');
  }
  if (isBacFunctionsQuestion(q)) {
    return hasBacFunctionsEvidence(safeChunks) ? answerBacFunctions()
      : evidenceGap('IRR of RA No. 12009, Section 42.1 (Functions of the BAC).');
  }
  if (isCircular06CoverageQuestion(q)) {
    return hasCircularCoverageEvidence(safeChunks) ? answerCircularCoverage()
      : evidenceGap('GPPB Circular No. 06-2026, Sections 3.2, 3.5, 4.2 and 4.7.');
  }
  if (isPpmpAppComparison(q)) {
    return hasPpmpAppEvidence(safeChunks) ? answerPpmpAppComparison()
      : evidenceGap('IRR of RA No. 12009, Sections 7.7.1–7.7.5 and 7.8.');
  }
  if (isPpmpDefinition(q)) {
    return hasPpmpAppEvidence(safeChunks) ? answerPpmpDefinition()
      : evidenceGap('IRR of RA No. 12009, Sections 7.7.1–7.7.5.');
  }
  if (isPrDefinition(q)) {
    return hasPmoPrEvidence(safeChunks) ? answerPrDefinition()
      : evidenceGap('MSU-GenSan PMO Administrative Manual (internal source; current approval/version should be confirmed).');
  }
  if (isPoDefinition(q)) {
    return hasPmoPoEvidence(safeChunks) ? answerPoDefinition()
      : evidenceGap('MSU-GenSan PMO Administrative Manual (internal source; current approval/version should be confirmed).');
  }
  if (isPrNumberAssignmentQuestion(q)) {
    return hasPrNumberEvidence(safeChunks) ? answerPrNumber()
      : evidenceGap('ProcureMateSU System Workflow and MSU-GenSan PMO Administrative Manual, Section B.2.');
  }
  if (isPrWorkflowQuestion(q)) {
    return hasPmoWorkflowEvidence(safeChunks) ? answerPmoWorkflow()
      : evidenceGap('MSU-GenSan PMO Administrative Manual, Section IV (Process Flow).');
  }
  if (isSvpCompetitiveComparison(q, conversationContext)) {
    if (!hasCurrentCompetitiveEvidence(safeChunks)) {
      return evidenceGap('IRR of RA No. 12009, Sections 27.1 and 34.1–34.3.');
    }
    const tagalog = /\b(?:tagalog|filipino|paliwanag|ipaliwanag)\b/i.test(q)
      || /(?:explain|simpler|simple)\s+(?:that|it|this).{0,30}tagalog/i.test(q);
    return answerSvpCompetitiveComparison(tagalog);
  }
  if (isLowestQuotationAwardQuestion(q)) {
    return hasLowestQuotationEvidence(safeChunks) ? answerLowestQuotation()
      : evidenceGap('IRR of RA No. 12009, Section 34.3(f)–(g).');
  }
  return null;
}

module.exports = { buildHighRiskProcurementResponse, isHighRiskProcurementQuestion };
