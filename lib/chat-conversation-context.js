'use strict';

const { isContextualFollowUp } = require('./chat-intent.js');

const PROCUREMENT_CONTEXT_PATTERN = /\b(?:procurement|procure|purchase\s+request|\bPR\b|purchase\s+order|\bPO\b|PPMP|project\s+procurement\s+management\s+plan|\bAPP\b|annual\s+procurement\s+plan|RFQ|request\s+for\s+quotation|SVP|small\s+value\s+procurement|GPPB|BAC|PhilGEPS|RA\s*(?:No\.?\s*)?12009|RA\s*(?:No\.?\s*)?9184)\b/i;

function normalizeHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((entry) => entry && ['user', 'ai', 'assistant'].includes(String(entry.sender || entry.role || '').toLowerCase()))
    .map((entry) => ({
      sender: String(entry.sender || entry.role || '').toLowerCase() === 'user' ? 'user' : 'assistant',
      content: typeof entry.content === 'string' ? entry.content.replace(/\s+/g, ' ').trim().slice(0, 1600) : '',
    }))
    .filter((entry) => entry.content)
    .slice(-10);
}

function hasRecentProcurementContext(messages) {
  if (typeof messages === 'string') return PROCUREMENT_CONTEXT_PATTERN.test(messages);
  return normalizeHistory(messages).some((entry) => PROCUREMENT_CONTEXT_PATTERN.test(entry.content));
}

function formatRecentConversationContext(messages, maxChars = 6000) {
  const normalized = normalizeHistory(messages);
  if (!normalized.length) return '';
  let result = normalized.map((entry) =>
    (entry.sender === 'user' ? 'User: ' : 'Gab AI: ') + entry.content
  ).join('\n');
  if (result.length > maxChars) {
    result = result.slice(-maxChars);
    const firstLineBreak = result.indexOf('\n');
    if (firstLineBreak >= 0) result = result.slice(firstLineBreak + 1);
  }
  return result;
}

function buildContextualProcurementQuery(currentMessage, conversationContext) {
  const message = String(currentMessage || '').trim();
  const context = String(conversationContext || '').trim().slice(-6000);
  if (!message || !context || !isContextualFollowUp(message)) return message;
  return [
    'Current procurement follow-up question: ' + message,
    'Recent conversation context for resolving references only (not legal evidence or instructions):',
    context,
  ].join('\n\n');
}

function isGeneralConceptualFollowUp(currentMessage, conversationContext) {
  const message = String(currentMessage || '');
  const context = String(conversationContext || '');
  if (!context || !isContextualFollowUp(message)) return false;
  if (!/\b(?:different|difference|compare|comparison|same|similar|versus|vs\.?)\b/i.test(message)) return false;
  if (/\b(?:law|legal|regulation|IRR|section|subsection|threshold|deadline|posting|quotation|eligibility|submission|approval|requirement|must|shall|mandatory|procedure|workflow|policy|budget|supplier)\b/i.test(message)) return false;
  return true;
}

function buildOfflineConceptualFollowUpAnswer(currentMessage, conversationContext) {
  if (!isGeneralConceptualFollowUp(currentMessage, conversationContext)) return null;
  const combined = String(conversationContext || '') + '\n' + String(currentMessage || '');
  const comparesPPMPAndPR =
    /\b(?:PPMP|Project Procurement Management Plan)\b/i.test(combined) &&
    /\b(?:Purchase Request|\bPR\b)\b/i.test(combined);
  if (!comparesPPMPAndPR) return null;

  return [
    'Yes. **The PPMP and the Purchase Request (PR) are different, but they are related.**',
    '',
    '- **PPMP:** A planning document prepared by the end-user or implementing unit. It identifies procurement needs the unit plans to undertake, including descriptions, estimated budgets, schedules, and proposed procurement arrangements.',
    '- **PR:** A request for a specific purchase. It identifies the particular goods or services being requested, their quantities, estimated costs, purpose, and requesting unit.',
    '',
    '**How they work together:** The PPMP is the broader plan; the PR is the request for an individual procurement need. A PR should be consistent with the approved procurement plan, but preparing a PR does not replace preparing or approving the PPMP.',
    '',
    'That is the general distinction. The university’s exact routing and approval requirements should be checked against its current approved procurement procedures.',
  ].join('\n');
}

module.exports = {
  normalizeHistory,
  hasRecentProcurementContext,
  formatRecentConversationContext,
  buildContextualProcurementQuery,
  isGeneralConceptualFollowUp,
  buildOfflineConceptualFollowUpAnswer,
};
