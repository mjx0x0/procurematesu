'use strict';

const PPMP_DEFINITION_QUESTION =
  /^(?:so\s+)?(?:what(?:'s|s)?\s+(?:(?:is|does)\s+)?(?:(?:the|a)\s+)?PPMP|what\s+does\s+PPMP\s+(?:mean|stand\s+for)|(?:define|explain)\s+(?:(?:the|a)\s+)?PPMP|meaning\s+of\s+PPMP)[?.!]*$/i;

function buildCommonProcurementDefinitionAnswer(query) {
  const text = String(query || '').replace(/\s+/g, ' ').trim();
  if (!PPMP_DEFINITION_QUESTION.test(text)) return null;

  return [
    'PPMP stands for Project Procurement Management Plan.',
    'It is a planning document that identifies the procurement needs an end-user unit expects to undertake and organizes those needs for procurement planning. It generally describes what goods, services, or works are needed, together with estimated costs and target timing.',
    'In simple terms, the PPMP is the broader procurement plan, while a Purchase Request (PR) is a request for a specific purchase. They are related, but they are not the same document.',
    'This is a general explanation. For MSU-General Santos-specific preparation, approval, or revision requirements, follow the current instructions of the Procurement Office.',
  ].join('\n\n');
}

module.exports = { buildCommonProcurementDefinitionAnswer };
