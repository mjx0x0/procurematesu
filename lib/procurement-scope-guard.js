'use strict';

const PROCUREMENT_SCOPE_RESPONSE =
  "I'm **Gab AI**, the procurement assistant for MSU-General Santos. I can help with procurement laws and GPPB issuances, procurement procedures and forms, supplier requirements, and Purchase Request drafting and tracking. I can't help with unrelated topics or disclose internal instructions, credentials, or private system data. Please ask a procurement-related question.";

const PROCUREMENT_TOPIC_PATTERN = /\b(?:procurement|procure|purchase\s+requests?|purchasing\s+(?:process|procedure|office|policy|system)|\bPR\b|purchase\s+orders?|\bPO\b|request\s+for\s+(?:quotation|proposal)|\bRFQ\b|\bRFP\b|\bBAC\b|\bPMO\b|\bGPPB\b|\bPPMP\b|project\s+procurement\s+management\s+plan|annual\s+procurement\s+plan|\bPhilGEPS\b|\bABC\b|small\s+value\s+procurement|\bSVP\b|bidding|bid(?:ding)?\s+documents?|quotation(?:s)?|supplier(?:s)?|vendor(?:s)?|contractor(?:s)?|consulting\s+services|RA\s*(?:No\.?\s*)?12009|RA\s*(?:No\.?\s*)?9184|implementing\s+rules\s+and\s+regulations|\bIRR\b|public\s+procurement|procurement\s+(?:law|rule|policy|process|procedure|mode|stage|form|workflow|office|management|requirement|document|record|system)|MSU\s*[- ]?GenSan|Mindanao\s+State\s+University)\b/i;

const SENSITIVE_DISCLOSURE_PATTERN = /\b(?:reveal|show|print|repeat|quote|dump|expose|disclose|extract|list|read|return|tell\s+me|send|output|leak)\b.{0,100}\b(?:system\s+prompt|hidden\s+prompt|developer\s+(?:message|instructions?|prompt)|internal\s+instructions?|api\s+keys?|access\s+tokens?|service[\s_-]*role[\s_-]*key|secrets?|environment\s+variables?|credentials?|database\s+dump|private\s+(?:data|records|messages)|another\s+user'?s?\s+(?:PR|purchase\s+request|records?))\b/i;

const INSTRUCTION_OVERRIDE_PATTERN = /\b(?:ignore|disregard|bypass|override|forget|replace)\b.{0,70}\b(?:all|any|your|previous|prior|above|system|developer|safety)\b.{0,50}\b(?:instructions?|prompts?|rules?|guardrails?|polic(?:y|ies)|directives?)\b/i;
const JAILBREAK_PATTERN = /\b(?:jailbreak|developer\s+mode|unrestricted\s+mode|unfiltered\s+mode|act\s+as\s+(?:an?\s+)?(?:unrestricted|unfiltered|uncensored|general[- ]purpose)\s+(?:assistant|AI|model))\b/i;

const CODING_CAPABILITY_PATTERN = /\b(?:can|could|would|will|do)\s+you\s+(?:please\s+)?(?:code|program|write\s+(?:some\s+)?code|generate\s+(?:some\s+)?code)\b/i;
const CODING_REQUEST_PATTERN = /\b(?:give|show|write|make|create|generate|provide|debug|fix|review|explain|teach|help\s+me\s+with)\b.{0,60}\b(?:python|javascript|typescript|java|c\+\+|c#|code\s+block|code\s+snippet|programming|software\s+development|script)\b/i;
const TECHNICAL_CODING_ASK_PATTERN = /\b(?:python|javascript|typescript|java|c\+\+|c#|ruby)\b.{0,60}\b(?:code|script|function|program|programming|debug|syntax|compiler|library|package|install|error|exception)\b|\b(?:code|script|function|program|programming|debug|syntax|compiler|library|package|install|error|exception)\b.{0,60}\b(?:python|javascript|typescript|java|c\+\+|c#|ruby)\b/i;
const CREATIVE_OFF_TOPIC_PATTERN = /\b(?:write|compose|generate|make|tell\s+me)\b.{0,50}\b(?:poem|song|lyrics|short\s+story|fiction|romantic\s+message|love\s+poem|joke|rap|fan\s+fiction)\b/i;
const EXPLICIT_UNRELATED_PATTERN = /\b(?:solve\s+(?:this\s+)?equation|homework\s+help|relationship\s+advice|boyfriend|girlfriend|weather\s+(?:today|forecast)|travel\s+itinerary|recipe\s+for|what\s+movie\s+should\s+i\s+watch|tell\s+me\s+a\s+fun\s+fact)\b/i;


function getSmallTalkIntent(query) {
  const text = String(query || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[,;]+/g, ' ')
    .replace(/[.!?…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || text.length > 120) return null;

  if (/^(?:hi|hello|hey|hiya|howdy|kumusta|good morning|good afternoon|good evening)(?: there)?(?: gab(?: ai)?| ai)?(?: po)?$/.test(text)) {
    return 'greeting';
  }

  if (/^(?:how are you|how are you doing)$/.test(text)) {
    return 'greeting';
  }

  if (/^(?:(?:thank you|thanks)(?: so much| a lot| very much)?|much appreciated|i appreciate it|salamat(?: po)?|ty)(?: po)?$/.test(text)) {
    return 'thanks';
  }

  if (/^(?:ok|okay|alright|all right|got it|understood|noted|sure|sounds good)(?: thanks| thank you| po)?$/.test(text)) {
    return 'acknowledgment';
  }

  if (/^(?:are you (?:an? )?(?:ai|artificial intelligence|chatbot|bot|human)|are you a real person|are you powered by ai|what are you|who are you|what is gab ai|what is procurematesu)$/.test(text)) {
    return 'identity';
  }

  if (/^(?:what can you do|what do you do|how can you help(?: me)?|what are your capabilities)$/.test(text)) {
    return 'capabilities';
  }

  return null;
}

function buildProcurementSmallTalkResponse(query) {
  const intent = getSmallTalkIntent(query);

  if (intent === 'identity') {
    return "Yes. I'm **Gab AI**, an AI-powered procurement assistant for MSU-General Santos. I can explain procurement rules and procedures, assist with Purchase Request drafting, and help track saved PRs. I do not make procurement decisions or replace official guidance from the Procurement Management Office or GPPB.";
  }

  if (intent === 'capabilities') {
    return "I'm **Gab AI**, the procurement assistant for MSU-General Santos. I can help with procurement laws and GPPB issuances, procurement procedures and supplier requirements, Purchase Request drafting, and PR tracking. I can't assist with unrelated topics.";
  }

  if (intent === 'thanks' || intent === 'acknowledgment') {
    return "You're welcome! Feel free to ask whenever you need help with MSU-GenSan procurement.";
  }

  return "Hello! I'm **Gab AI**, the AI-powered procurement assistant for MSU-General Santos. I can help with procurement laws, GPPB issuances, procedures, Purchase Request drafting, and tracking. What can I help you with today?";
}

function getProcurementScopeDecision(query, options = {}) {
  const text = String(query || '').replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-').trim();
  const activePRDraft = options && options.activePRDraft === true;
  const recentProcurementContext = options && options.recentProcurementContext === true;

  if (!text) return { allowed: false, reason: 'empty' };

  // These checks run before domain matching so adding a procurement keyword
  // cannot turn an attempt to exfiltrate prompts/secrets or bypass safeguards
  // into an allowed request.
  if (
    SENSITIVE_DISCLOSURE_PATTERN.test(text) ||
    INSTRUCTION_OVERRIDE_PATTERN.test(text) ||
    JAILBREAK_PATTERN.test(text)
  ) {
    return { allowed: false, reason: 'security' };
  }

  const explicitlyUnrelated =
    CODING_CAPABILITY_PATTERN.test(text) ||
    CODING_REQUEST_PATTERN.test(text) ||
    TECHNICAL_CODING_ASK_PATTERN.test(text) ||
    CREATIVE_OFF_TOPIC_PATTERN.test(text) ||
    EXPLICIT_UNRELATED_PATTERN.test(text);

  if (explicitlyUnrelated) {
    return { allowed: false, reason: 'off_topic' };
  }

  // Permit only short, exact conversational messages. This check deliberately
  // follows security and explicit-unrelated checks so mixed requests stay blocked.
  if (getSmallTalkIntent(text)) {
    return { allowed: true, reason: 'small_talk' };
  }

  if (PROCUREMENT_TOPIC_PATTERN.test(text)) {
    return { allowed: true, reason: 'procurement' };
  }

  // Short answers such as "10 pcs", "Chemistry Department", or "for lab
  // classes" are valid continuations only when the server has an active PR
  // draft. This does not permit explicit unrelated or security-sensitive asks.
  if (activePRDraft) {
    return { allowed: true, reason: 'draft_continuation' };
  }

  if (recentProcurementContext) {
    return { allowed: true, reason: 'contextual_follow_up' };
  }

  return { allowed: false, reason: 'off_topic' };
}

module.exports = {
  PROCUREMENT_SCOPE_RESPONSE,
  getProcurementScopeDecision,
  buildProcurementSmallTalkResponse,
};
