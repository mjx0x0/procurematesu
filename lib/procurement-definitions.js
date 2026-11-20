'use strict';

const PPMP_DEFINITION_QUESTION =
  /^(?:so\\s+)?(?:what(?:'s|s)?\\s+(?:(?:is|does)\\s+)?(?:(?:the|a)\\s+)?PPMP|what\\s+does\\s+PPMP\\s+(?:mean|stand\\s+for)|(?:define|explain)\\s+(?:(?:the|a)\\s+)?PPMP|meaning\\s+of\\s+PPMP)[?.!]*$/i;

const PR_DEFINITION_QUESTION =
  /^(?:so\\s+)?(?:what\\s+(?:is|does)\\s+(?:(?:the|a)\\s+)?(?:PR|purchase\\s+request)|what\\s+does\\s+(?:(?:the|a)\\s+)?(?:PR|purchase\\s+request)\\s+(?:mean|stand\\s+for)|(?:define|explain)\\s+(?:(?:the|a)\\s+)?(?:PR|purchase\\s+request)|meaning\\s+of\\s+(?:(?:the|a)\\s+)?(?:PR|purchase\\s+request))[?.!]*$/i;

function buildCommonProcurementDefinitionAnswer(query) {
  const text = String(query || '').replace(/\\s+/g, ' ').trim();

  // Keep this handler limited to standalone definition questions. Questions
  // about PR requirements, preparation, approval, or workflow must use RAG.
  if (PR_DEFINITION_QUESTION.test(text)) {
    return [
      '**PR stands for Purchase Request.**',
      'A Purchase Request (PR) is an internal document used by an end-user unit to formally request the procurement of goods, services, or works. It identifies the items or services being requested and provides the information the university needs to review and process the request.',
      'In simple terms, a PR tells the Procurement Office what the requesting unit needs to purchase.',
      'This is a general explanation of the term. For MSU-General Santos-specific contents, forms, and approval procedures, follow the current instructions of the Procurement Office.',
    ].join('\\n\\n');
  }

  if (!PPMP_DEFINITION_QUESTION.test(text)) return null;

  return [
    'PPMP stands for Project Procurement Management Plan.',
    'It is a planning document that identifies the procurement needs an end-user unit expects to undertake and organizes those needs for procurement planning. It generally describes what goods, services, or works are needed, together with estimated costs and target timing.',
    'In simple terms, the PPMP is the broader procurement plan, while a Purchase Request (PR) is a request for a specific purchase. They are related, but they are not the same document.',
    'This is a general explanation. For MSU-General Santos-specific preparation, approval, or revision requirements, follow the current instructions of the Procurement Office.',
  ].join('\\n\\n');
}

module.exports = { buildCommonProcurementDefinitionAnswer };
