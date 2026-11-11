'use strict';

const PR_IDENTIFIER_PATTERN = /\bPR\s*-?\s*(?:TEMP\s*-?\s*)?(?:\d{4}\s*-?\s*)?\d{1,12}\b/i;
const CREATE_PR_PATTERNS = [
  /\b(?:help|assist|guide)\s+(?:me|us)\s+(?:to\s+)?(?:prepare|draft|create|make|start|fill(?:\s+out)?)\s+(?:(?:a|an|new)\s+)?(?:purchase\s+request|pr)\b/i,
  /\b(?:can|could|would)\s+you\s+(?:please\s+)?(?:help\s+(?:me|us)\s+(?:to\s+)?)?(?:prepare|draft|create|make|start|fill(?:\s+out)?)\s+(?:(?:a|an|new)\s+)?(?:purchase\s+request|pr)\b/i,
  /\b(?:i|we)\s+(?:need|want)\s+(?:to\s+)?(?:prepare|draft|create|make|start|fill(?:\s+out)?)\s+(?:(?:a|an|new)\s+)?(?:purchase\s+request|pr)\b/i,
  /^\s*(?:please\s+)?(?:prepare|draft|create|make|start|fill(?:\s+out)?)\s+(?:(?:a|an|new)\s+)?(?:purchase\s+request|pr)\b/i,
  /\b(?:start|begin)\s+(?:a|an|new)\s+(?:purchase\s+request|pr)\b/i,
  /\b(?:i|we)\s+need\s+help\s+(?:to\s+)?(?:prepare|draft|create|make|start|fill(?:\s+out)?)\s+(?:(?:a|an|new)\s+)?(?:purchase\s+request|pr)\b/i,
  /\b(?:i|we)\s+need\s+help\s+(?:with\s+)?(?:preparing|drafting|creating|making|starting|filling\s+out)\s+(?:(?:a|an|new)\s+)?(?:purchase\s+request|pr)\b/i,
  /\b(?:help|assist|guide)\s+(?:me|us)\s+(?:with\s+)?(?:preparing|drafting|creating|making|filling\s+out)\s+(?:(?:a|an|new)\s+)?(?:purchase\s+request|pr)\b/i,
  /\bnew\s+(?:purchase\s+request|pr)\b/i,
];
const HOW_TO_QUESTION_PATTERN =
  /^\s*(?:how\s+(?:do|can|should|would)\s+i|what\s+(?:are|is)\s+the\s+(?:steps|process|requirements)|what\s+documents|which\s+documents|what\s+should\s+i\s+(?:include|attach)|can\s+i)\b/i;
const PROCUREMENT_QUESTION_TERMS =
  /\b(?:purchase\s+request|\bpr\b|procurement|ppmp|app|rfq|request\s+for\s+quotation|supplier|quotation|canvass(?:ing)?|bidding|ra\s*12009|ra\s*9184|gppb|budget\s+office|procurement\s+office|pmo|bac|eligibility|requirements?|attachments?|supporting\s+documents?|forms?|workflow|process|stage|threshold|svp|purpose|quantity|unit\s+cost|unit\s+price)\b/i;
const INFORMATION_QUESTION_PATTERN =
  /^\s*(?:what|which|why|when|where|who|how|can\s+i|could\s+i|should\s+i|must\s+i|do\s+i|does|is|are|explain|describe|tell\s+me|show\s+me|list|provide)\b/i;
const INFORMATION_REQUEST_PATTERN =
  /\b(?:requirements?\s+for|documents?\s+(?:needed|required|to\s+attach)|attachments?\s+(?:needed|required)|how\s+to\s+(?:prepare|create|draft|submit)|steps?\s+to\s+(?:prepare|create|submit)|explain\s+(?:the\s+)?(?:process|procedure|requirements)|what\s+to\s+(?:include|attach))\b/i;
const AMBIGUOUS_PR_HELP_PATTERN =
  /^\s*(?:(?:(?:can|could|would)\s+you\s+)?(?:please\s+)?(?:help|assist|guide)\s+(?:me|us)\s+(?:with|on)|(?:i|we)\s+(?:need|want)\s+help\s+(?:with|on))\s+(?:(?:a|an|my|the|this)\s+)?(?:purchase\s+request|pr)[?.!]*\s*$/i;
const PR_INTENT_CLARIFICATION_RESPONSE =
  'Would you like me to **explain PR requirements and procedures**, or would you like to **start preparing a Purchase Request draft**? If you want to create one, say “Help me prepare a Purchase Request.”';
const LIST_MY_PRS_PATTERN =
  /\b(?:track|show|list|view)\s+(?:(?:me|us)\s+)?(?:my|our|all|submitted)\s+(?:(?:submitted|tracked)\s+)?(?:pr|prs|purchase\s+requests?)\b|\bmy\s+(?:pr|prs|purchase\s+requests?)\s+(?:status|tracking|progress)\b/i;
const TRACK_WORDS_PATTERN =
  /\b(?:track|tracking|status|progress|timeline|history|where\s+is|look\s+up|lookup|find|check|view|show|open|details?)\b/i;
const DRAFT_REVISION_PATTERN =
  /\b(?:add|include|append|remove|delete|correct|change|update|revise|replace|increase|decrease|adjust|modify|forgot\s+to\s+(?:add|include)|also\s+need|one\s+more\s+item|additional\s+item|another\s+item|quantity|unit\s+cost|unit\s+price)\b/i;

function normalizeIntentText(value) {
  return String(value || '')
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPRIdentifier(value) {
  const match = normalizeIntentText(value).match(PR_IDENTIFIER_PATTERN);
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : null;
}

function isExplicitPRCreationRequest(value) {
  const text = normalizeIntentText(value);
  if (!text) return false;
  // "How do I prepare a PR?" asks for instructions, not an action.
  if (HOW_TO_QUESTION_PATTERN.test(text) && !/^\s*(?:can|could|would)\s+you\b/i.test(text)) return false;
  return CREATE_PR_PATTERNS.some((pattern) => pattern.test(text));
}

function isProcurementInformationQuestion(value) {
  const text = normalizeIntentText(value);
  if (!text || !PROCUREMENT_QUESTION_TERMS.test(text)) return false;
  return INFORMATION_QUESTION_PATTERN.test(text)
    || INFORMATION_REQUEST_PATTERN.test(text)
    || (text.includes('?') && /\b(?:what|which|why|when|where|who|how|can|could|should|must|do|does|is|are)\b/i.test(text));
}

function classifyProcurementIntent(value, context = {}) {
  const text = normalizeIntentText(value);
  if (!text) return 'general';
  if (isExplicitPRCreationRequest(text)) return 'create_pr_draft';
  if (LIST_MY_PRS_PATTERN.test(text)) return 'list_prs';
  const prIdentifier = extractPRIdentifier(text);
  if (prIdentifier && TRACK_WORDS_PATTERN.test(text)) return 'track_pr';
  if (AMBIGUOUS_PR_HELP_PATTERN.test(text)) return 'clarify_pr_intent';
  if (isProcurementInformationQuestion(text)) return 'procurement_question';
  if (context.draftReady && DRAFT_REVISION_PATTERN.test(text)) return 'draft_revision';
  if (context.activeDraft) return 'draft_continuation';
  return 'general';
}

module.exports = {
  classifyProcurementIntent,
  extractPRIdentifier,
  isExplicitPRCreationRequest,
  isProcurementInformationQuestion,
  PR_INTENT_CLARIFICATION_RESPONSE,
};
