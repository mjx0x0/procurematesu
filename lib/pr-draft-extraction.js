'use strict';

const UNIT_PATTERN = 'pieces?|pcs?|units?|sets?|reams?|boxes?|packs?|rolls?|bottles?|pairs?|kits?|licenses?|subscriptions?|ream|liters?|meters?|hours?|days?|lots?';

function clean(value) {
  return String(value || '')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnit(rawUnit) {
  const value = String(rawUnit || '').toLowerCase().replace(/\.$/, '');
  if (/^(?:piece|pieces|pc|pcs)$/.test(value)) return 'pcs';
  if (/^units?$/.test(value)) return 'units';
  if (/^sets?$/.test(value)) return 'sets';
  if (/^reams?$/.test(value)) return 'reams';
  if (/^boxes?$/.test(value)) return 'boxes';
  if (/^packs?$/.test(value)) return 'packs';
  if (/^rolls?$/.test(value)) return 'rolls';
  if (/^bottles?$/.test(value)) return 'bottles';
  if (/^pairs?$/.test(value)) return 'pairs';
  if (/^kits?$/.test(value)) return 'kits';
  if (/^licenses?$/.test(value)) return 'licenses';
  if (/^subscriptions?$/.test(value)) return 'subscriptions';
  if (/^liters?$/.test(value)) return 'liters';
  if (/^meters?$/.test(value)) return 'meters';
  if (/^hours?$/.test(value)) return 'hours';
  if (/^days?$/.test(value)) return 'days';
  if (/^lots?$/.test(value)) return 'lots';
  return value || '';
}

function extractDepartment(value) {
  const text = clean(value);
  const labelled = text.match(/\b(?:requesting\s+)?(?:department|dept\.?|college|office|school|faculty|unit|institute|center|division)\s*[:=]\s*([^,;.\n]+)/i);
  if (labelled && labelled[1].trim()) return labelled[1].trim();

  const titleFirst = text.match(/\b(?:college|department|dept\.?|school|faculty|institute|center|division)\s+(?:of\s+(?:the\s+)?)?[^,;.\n]+/i);
  if (titleFirst) return titleFirst[0].trim();

  const office = text.match(/\boffice\s+of\s+(?:the\s+)?[^,;.\n]+/i);
  if (office) return office[0].trim();

  const labOrUnit = text.match(/\b(?:laboratory|lab|unit)\s+of\s+(?:the\s+)?[^,;.\n]+/i);
  if (labOrUnit) return labOrUnit[0].trim();

  const suffix = text.match(/\b([A-Z][A-Za-z'&/-]*(?:\s+[A-Z][A-Za-z'&/-]*){0,5}\s+(?:department|office|college|school|institute|center|division))\b/);
  return suffix ? suffix[1].trim() : null;
}

function removePhrase(source, phrase) {
  if (!source || !phrase) return source;
  const index = source.toLowerCase().indexOf(String(phrase).toLowerCase());
  if (index < 0) return source;
  return source.slice(0, index) + ' ' + source.slice(index + phrase.length);
}

function cleanDescription(value, department) {
  let text = clean(value);
  text = removePhrase(text, department);
  text = text
    .replace(/^(?:purpose|department|dept|items?|goods?)\s*[:=-]\s*/i, '')
    .replace(/^(?:(?:and|also|plus|add|include|of)\s+)+/i, '')
    .replace(/^(?:for\s+)?(?:the\s+)?/i, (match) => match.toLowerCase() === 'for ' ? '' : match)
    .replace(/\b(?:at|@|costing|cost|priced\s+at)\s*$/i, '')
    .replace(/^[,;:\s-]+|[,;:\s-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function inferItemDescriptionFromPurpose(value) {
  let text = clean(value)
    .replace(/^(?:purpose\s*[:=-]\s*)/i, '')
    .replace(/^.*?\b(?:procurement\s+of|purchase\s+of|buying|procure|acquire)\s+/i, '');

  text = text
    .replace(/\s+for\s+(?:(?:the\s+)?\d+(?:st|nd|rd|th)\s+semester\s+)?[^,;]*\b(?:courses?|classes|students?|research|instruction|teaching|operations|activities|programs?)\b.*$/i, '')
    .replace(/\s+to\s+(?:support|be used|provide)\b.*$/i, '')
    .replace(/\s+for\s+(?:use|teaching|research|instruction|laboratory|office)\b.*$/i, '')
    .replace(/[,. ;:]+$/g, '')
    .trim();

  if (/^(?:item|items|goods|materials|supplies|equipment|various items|miscellaneous items)$/i.test(text)) return '';
  return text.length > 2 ? text : '';
}

function parsePriceAfter(value) {
  const pattern = /(?:\b(?:at|@|costing|cost|priced\s+at|price\s+of)\s*)?(?:₱|PHP|Php)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(?:pesos?|php|₱)?\s*(?:each|per\s*(?:unit|pc|piece|item))\b/i;
  const match = String(value || '').match(pattern);
  if (!match) return null;
  return {
    index: match.index || 0,
    end: (match.index || 0) + match[0].length,
    amount: Number(match[1].replace(/,/g, '')) || 0,
  };
}

function parsePRItems(value, options) {
  const text = clean(value);
  const opts = options && typeof options === 'object' ? options : {};
  const department = opts.department || extractDepartment(text);
  const purpose = clean(opts.purpose || '');
  const qtyPattern = new RegExp('\\b(\\d+)\\s*(' + UNIT_PATTERN + ')\\b', 'gi');
  const quantityMatches = Array.from(text.matchAll(qtyPattern));
  const items = [];

  for (let index = 0; index < quantityMatches.length; index += 1) {
    const quantityMatch = quantityMatches[index];
    const start = quantityMatch.index || 0;
    const tokenEnd = start + quantityMatch[0].length;
    const nextStart = index + 1 < quantityMatches.length
      ? (quantityMatches[index + 1].index || text.length)
      : text.length;
    const previousEnd = index === 0 ? 0 : (items[index - 1].sourceEnd || start);

    const before = text.slice(previousEnd, start);
    const after = text.slice(tokenEnd, nextStart);
    const price = parsePriceAfter(after);
    const afterDescription = cleanDescription(
      price ? after.slice(0, price.index) : after,
      department
    );
    let beforeDescription = cleanDescription(before, department);
    if (/^(?:procurement\s+of|purchase\s+of|buying|procure|acquire)\b/i.test(beforeDescription)) {
      beforeDescription = inferItemDescriptionFromPurpose(beforeDescription);
    }

    let description = afterDescription || beforeDescription;
    if (!description && index === 0 && quantityMatches.length === 1) {
      description = inferItemDescriptionFromPurpose(purpose || before);
    }

    const quantity = Math.max(0, parseInt(quantityMatch[1], 10) || 0);
    const unit = normalizeUnit(quantityMatch[2]);
    const unitCost = price ? price.amount : 0;
    const totalCost = quantity * unitCost;

    items.push({
      item_description: description,
      quantity,
      unit,
      unit_cost: unitCost,
      total_cost: totalCost,
      sourceEnd: price ? tokenEnd + price.end : tokenEnd + after.length,
    });
  }

  // A description and unit price without a quantity is an incomplete item,
  // not a reason to invent a quantity.
  if (!items.length) {
    const price = parsePriceAfter(text);
    if (price) {
      const description = cleanDescription(text.slice(0, price.index), department)
        || inferItemDescriptionFromPurpose(purpose);
      items.push({
        item_description: description,
        quantity: 0,
        unit: '',
        unit_cost: price.amount,
        total_cost: 0,
        sourceEnd: text.length,
      });
    }
  }

  return items.map(({ sourceEnd, ...item }) => item);
}

function extractPurpose(value, department) {
  const text = clean(value);
  const labelled = text.match(/\bpurpose\s*[:=-]\s*([\s\S]*?)(?=\s*(?:department|dept|college|office)\s*[:=]|$)/i);
  if (labelled && labelled[1].trim()) {
    return clean(removePhrase(labelled[1], department)).replace(/[,;]+$/g, '').trim();
  }

  const qtyMatch = text.match(new RegExp('\\b\\d+\\s*(?:' + UNIT_PATTERN + ')\\b', 'i'));
  const beforeQuantity = qtyMatch ? text.slice(0, qtyMatch.index || 0) : text;
  const withoutDepartment = removePhrase(beforeQuantity, department);
  return clean(withoutDepartment)
    .replace(/^(?:purpose|department)\s*[:=-]\s*/i, '')
    .replace(/^[,;:\s]+|[,;:\s]+$/g, '');
}

function extractPRDetailsRuleBased(value) {
  const text = clean(value);
  const department = extractDepartment(text);
  const purpose = extractPurpose(text, department);
  const items = parsePRItems(text, { department, purpose });
  return {
    department,
    purpose,
    items,
    total_amount: items.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0),
  };
}

function isCompleteItem(item) {
  return Boolean(
    item &&
    String(item.item_description || '').trim().length > 2 &&
    Number(item.quantity) > 0 &&
    String(item.unit || '').trim() &&
    Number(item.unit_cost) > 0
  );
}

function hasCompletePRDetails(extracted) {
  if (!extracted || typeof extracted !== 'object') return false;
  if (!String(extracted.department || '').trim() || !String(extracted.purpose || '').trim()) return false;
  if (!Array.isArray(extracted.items) || extracted.items.length === 0) return false;
  return extracted.items.every(isCompleteItem);
}

function getMissingItemFields(items) {
  const list = Array.isArray(items) ? items : [];
  return list.map((item, index) => {
    const missing = [];
    if (String(item && item.item_description || '').trim().length <= 2) missing.push('item description');
    if (!(Number(item && item.quantity) > 0)) missing.push('quantity');
    if (!String(item && item.unit || '').trim()) missing.push('unit');
    if (!(Number(item && item.unit_cost) > 0)) missing.push('estimated unit cost');
    return { index: index + 1, description: String(item && item.item_description || '').trim(), missing };
  }).filter((entry) => entry.missing.length > 0);
}

function hasExplicitPricedItemDetails(value) {
  const items = parsePRItems(value);
  return items.length > 0 && items.some((item) => item.quantity > 0 && item.unit_cost > 0);
}

function mergePRDetailsFromDepartmentReply(purposeValue, replyValue, existingValue) {
  const purpose = clean(purposeValue || (existingValue && existingValue.purpose) || '');
  const reply = clean(replyValue);
  const existing = existingValue && typeof existingValue === 'object' ? existingValue : {};
  const department = extractDepartment(reply) || existing.department || null;

  const parsed = extractPRDetailsRuleBased([purpose, reply].filter(Boolean).join(', '));
  const replyHasItemDetails = parsePRItems(reply, { purpose, department }).length > 0;
  const items = replyHasItemDetails
    ? parsed.items
    : (Array.isArray(existing.items) ? existing.items : parsed.items);

  return {
    department,
    purpose: purpose || existing.purpose || parsed.purpose || null,
    items,
    total_amount: items.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0),
  };
}

function isPRDraftRevisionMessage(value) {
  const text = clean(value);
  return /\b(?:add|include|append|remove|delete|correct|change|update|revise|replace|increase|decrease|adjust|modify)\b/i.test(text)
    || /\b(?:forgot to (?:add|include)|also need|one more item|additional item|another item|quantity|unit cost|unit price)\b/i.test(text)
    || /\bitem\s*(?:number|no\.?|#)?\s*\d+\b/i.test(text);
}

function isPlausibleDraftReply(step, value) {
  const text = clean(value);
  if (text.length < 2 || !/[a-z0-9]/i.test(text)) return false;
  if (/(.)\1{4,}/i.test(text)) return false;
  const letters = (text.match(/[a-z]/gi) || []).length;
  const vowels = (text.match(/[aeiou]/gi) || []).length;
  if (letters >= 8 && vowels === 0) return false;
  if (step === 'purpose' && text.length < 8) return false;
  return true;
}

function normalizeItemFingerprint(item) {
  return [
    String(item && item.item_description || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
    Number(item && item.quantity) || 0,
    String(item && item.unit || '').toLowerCase().trim(),
    Number(item && item.unit_cost) || 0,
  ].join('|');
}

function parseCorrectionTarget(message, items) {
  const indexed = message.match(/\b(?:item|line)\s*(?:number|no\.?|#)?\s*(\d+)\b/i);
  if (indexed) {
    const index = Number(indexed[1]) - 1;
    return index >= 0 && index < items.length ? index : -1;
  }

  const lower = message.toLowerCase();
  const matches = items
    .map((item, index) => ({ index, name: String(item.item_description || '').toLowerCase().trim() }))
    .filter((item) => item.name.length > 2 && lower.includes(item.name));
  if (matches.length === 1) return matches[0].index;
  if (items.length === 1) return 0;
  return -1;
}

function parseCorrectionPatch(message) {
  const text = clean(message);
  const patch = {};
  const quantityMatch = text.match(/\b(?:quantity|qty)\b[\s\S]{0,32}?\b(?:to|as|=)\s*(\d+)\s*([a-zA-Z]+)?/i)
    || text.match(/\b(?:make it|change it to|set it to|actually use|only)\s+(\d+)\s*([a-zA-Z]+)?/i);
  if (quantityMatch) {
    patch.quantity = Number(quantityMatch[1]);
    if (quantityMatch[2]) patch.unit = normalizeUnit(quantityMatch[2]);
  }

  const unitMatch = text.match(/\bunit\b\s*(?:to|as|=)\s*([a-zA-Z]+)/i);
  if (unitMatch) patch.unit = normalizeUnit(unitMatch[1]);

  const priceMatch = text.match(/\b(?:unit\s+cost|unit\s+price|price|cost)\b[\s\S]{0,32}?\b(?:to|as|=)\s*(?:₱|PHP|Php)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  const parsedPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : null;
  const standalonePrice = parsePriceAfter(text);
  if (parsedPrice !== null && Number.isFinite(parsedPrice)) patch.unit_cost = parsedPrice;
  else if (standalonePrice) patch.unit_cost = standalonePrice.amount;

  const descriptionMatch = text.match(/\b(?:description|item\s+name)\b\s*(?:to|as|=)\s*["']?(.+?)["']?$/i);
  if (descriptionMatch) patch.item_description = clean(descriptionMatch[1]);
  return patch;
}

function applyPRItemMessage(existingItems, message, options) {
  const items = Array.isArray(existingItems) ? existingItems.map((item) => ({ ...item })) : [];
  const text = clean(message);
  const opts = options && typeof options === 'object' ? options : {};
  const correctionIntent = /\b(correct|change|update|revise|replace|actually|instead|make it|set it|only)\b/i.test(text);
  const purpose = clean(opts.purpose || '');
  const department = opts.department || null;

  if (correctionIntent && items.length) {
    const target = parseCorrectionTarget(text, items);
    if (target < 0) return { action: 'clarify', items, reason: 'Please specify which item number or item description you want to correct.' };
    const replacement = parsePRItems(text, { purpose: '', department: null });
    const fullReplacement = /\b(?:replace|change|update|correct)\b[\s\S]*?\b(?:with|to)\b/i.test(text);
    if (fullReplacement && replacement.length === 1 && isCompleteItem(replacement[0])) {
      items[target] = { ...replacement[0] };
      return { action: 'updated', items, index: target };
    }

    const patch = parseCorrectionPatch(text);
    if (!Object.keys(patch).length && replacement.length === 1 && isCompleteItem(replacement[0])) {
      Object.assign(patch, replacement[0]);
    }
    if (!Object.keys(patch).length) return { action: 'clarify', items, reason: 'Please state the corrected field and value, such as quantity, unit, description, or estimated unit cost.' };
    items[target] = { ...items[target], ...patch };
    items[target].total_cost = (Number(items[target].quantity) || 0) * (Number(items[target].unit_cost) || 0);
    return { action: 'updated', items, index: target };
  }

  // A reply may be the missing part of one incomplete item (e.g. its
  // description, quantity/unit, or price). Merge that field into the line
  // instead of adding a second, incomplete line.
  const incompleteIndexes = items.map((item, index) => isCompleteItem(item) ? -1 : index).filter((index) => index >= 0);
  const addIntent = /\b(?:add|include|also add|another item|additional item|plus)\b/i.test(text);
  const parsedReply = parsePRItems(text, { purpose, department });
  // Multiple clear item lines are an addition/list update, not an answer to
  // just one missing field in an older incomplete line.
  if (incompleteIndexes.length && !addIntent && parsedReply.length <= 1) {
    let target = -1;
    const explicitTarget = parseCorrectionTarget(text, items);
    if (explicitTarget >= 0 && incompleteIndexes.includes(explicitTarget)) target = explicitTarget;
    else if (incompleteIndexes.length === 1) target = incompleteIndexes[0];
    else if (incompleteIndexes.length > 1) {
      return { action: 'clarify', items, reason: 'Several items are incomplete. Please identify the item number whose missing details you are providing.' };
    }

    if (target >= 0) {
      const parsedPartial = parsePRItems(text, { purpose: '', department });
      const patch = {};
      if (parsedPartial.length === 1) {
        const candidate = parsedPartial[0];
        const existing = items[target];
        const candidateDescription = String(candidate.item_description || '').trim().toLowerCase();
        const existingDescription = String(existing.item_description || '').trim().toLowerCase();
        const conflictingDetails =
          (existingDescription && candidateDescription && existingDescription !== candidateDescription) ||
          (Number(existing.quantity) > 0 && Number(candidate.quantity) > 0 && Number(existing.quantity) !== Number(candidate.quantity)) ||
          (String(existing.unit || '').trim() && String(candidate.unit || '').trim() && String(existing.unit).toLowerCase() !== String(candidate.unit).toLowerCase()) ||
          (Number(existing.unit_cost) > 0 && Number(candidate.unit_cost) > 0 && Number(existing.unit_cost) !== Number(candidate.unit_cost));
        // If the reply describes a different complete item, leave the older
        // incomplete line intact; the parser below will append the new item.
        if (!conflictingDetails) {
          if (candidateDescription.length > 2) patch.item_description = candidate.item_description;
          if (Number(candidate.quantity) > 0) patch.quantity = Number(candidate.quantity);
          if (String(candidate.unit || '').trim()) patch.unit = candidate.unit;
          if (Number(candidate.unit_cost) > 0) patch.unit_cost = Number(candidate.unit_cost);
        }
      }
      if (!Object.keys(patch).length && !/\d/.test(text) && !parsePriceAfter(text)) {
        const description = cleanDescription(text, department).replace(/^(?:item\s+description|description)\s*[:=-]\s*/i, '').trim();
        if (description.length > 2) patch.item_description = description;
      }
      if (Object.keys(patch).length) {
        items[target] = { ...items[target], ...patch };
        items[target].total_cost = (Number(items[target].quantity) || 0) * (Number(items[target].unit_cost) || 0);
        return { action: 'updated', items, index: target };
      }
    }
  }

  const parsed = parsedReply;
  if (!parsed.length) return { action: 'unrecognized', items, reason: 'I could not identify item details in that reply. Please include an item description, quantity and unit, or a price.' };

  const added = [];
  for (const item of parsed) {
    const fingerprint = normalizeItemFingerprint(item);
    if (items.some((existing) => normalizeItemFingerprint(existing) === fingerprint)) continue;
    items.push(item);
    added.push(item);
  }
  if (!added.length) return { action: 'duplicate', items, reason: 'That exact item is already in the draft.' };
  return { action: 'added', items, added };
}

/**
 * A completed draft remains editable only within the chat session that owns it.
 * Require an explicit item-field correction or an explicit addition of a
 * parseable item so ordinary procurement questions continue through the
 * normal chatbot path.
 */
function isCompletedPRDraftEdit(state, message) {
  if (!state || state.drafting === true) return false;
  const extracted = state.collected && state.collected.extracted;
  if (!hasCompletePRDetails(extracted)) return false;

  const text = clean(message);
  if (!text) return false;

  const editVerb = /\b(?:change|correct|update|revise|replace|modify|edit|increase|decrease)\b/i;
  const itemField = /\b(?:quantity|qty|unit|description|unit\s+cost|unit\s+price|price|cost)\b/i;
  const indexedItemReplacement = /\b(?:change|correct|update|revise|replace|modify|edit)\s+(?:item|line)\s*(?:number|no\.?|#)?\s*\d+\b/i;
  if ((editVerb.test(text) && itemField.test(text)) || indexedItemReplacement.test(text)) return true;

  const addIntent = /\b(?:add|include)\b|\b(?:another|additional)\s+item\b/i;
  return addIntent.test(text) && parsePRItems(text, { purpose: '', department: null }).length > 0;
}

module.exports = {
  extractPRDetailsRuleBased,
  parsePRItems,
  hasCompletePRDetails,
  isCompleteItem,
  getMissingItemFields,
  isPlausibleDraftReply,
  isPRDraftRevisionMessage,
  hasExplicitPricedItemDetails,
  mergePRDetailsFromDepartmentReply,
  applyPRItemMessage,
  isCompletedPRDraftEdit,
};
