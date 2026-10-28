'use strict';

function clean(value) {
  return String(value || '').replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-').replace(/\s+/g, ' ').trim();
}

function extractDepartment(text) {
  const keyed = text.match(/\b(?:requesting\s+)?(?:department|dept\.?|college|office|school|faculty|unit|institute|center|division)\s*[:=]\s*([^,;.\n]+)/i);
  if (keyed && keyed[1].trim()) return keyed[1].trim();

  // Match organization names as complete phrases, not only the word that labels them.
  // Do not treat "laboratory supplies" or "office supplies" as departments.
  const titleFirst = text.match(/\b(?:college|department|dept\.?|school|faculty|institute|center|division)\s+(?:of\s+(?:the\s+)?)?[^,;.\n]+/i);
  if (titleFirst) return titleFirst[0].trim();

  const office = text.match(/\boffice\s+of\s+(?:the\s+)?[^,;.\n]+/i);
  if (office) return office[0].trim();

  const labOrUnit = text.match(/\b(?:laboratory|lab|unit)\s+of\s+(?:the\s+)?[^,;.\n]+/i);
  if (labOrUnit) return labOrUnit[0].trim();

  const suffix = text.match(/\b([A-Z][A-Za-z'&/-]*(?:\s+[A-Z][A-Za-z'&/-]*){0,5}\s+(?:department|office|college|school|institute|center|division))\b/);
  return suffix ? suffix[1].trim() : null;
}

function removeCaseInsensitive(source, phrase) {
  if (!source || !phrase) return source;
  const lowerSource = source.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();
  const index = lowerSource.indexOf(lowerPhrase);
  if (index < 0) return source;
  return source.slice(0, index) + source.slice(index + phrase.length);
}

function normalizedUnit(rawUnit) {
  const value = String(rawUnit || '').toLowerCase();
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
  return value || 'pcs';
}

function extractPRDetailsRuleBased(value) {
  const text = clean(value);
  let department = extractDepartment(text);

  const qtyPriceMatch = text.match(
    /\b(\d+)\s*(pieces?|pcs?|units?|sets?|reams?|boxes?|packs?|rolls?|bottles?|pairs?|kits?|licenses?|subscriptions?)\b\s*(?:,|and)?\s*(?:for\s+)?(?:₱|PHP|Php)?\s*([\d,]+(?:\.\d+)?)\s*(?:pesos?|php|₱)?\s*(?:per\s+(?:unit|piece|pc|item)|each)\b/i
  );

  if (qtyPriceMatch) {
    const quantity = Math.max(0, parseInt(qtyPriceMatch[1], 10) || 0);
    const unit = normalizedUnit(qtyPriceMatch[2]);
    const unitCost = Math.max(0, parseFloat(qtyPriceMatch[3].replace(/,/g, '')) || 0);

    let purposeSource = text.slice(0, qtyPriceMatch.index || 0).trim();
    // Remove the requesting unit before deriving either the purpose or item name.
    purposeSource = removeCaseInsensitive(purposeSource, department);
    purposeSource = purposeSource.replace(/[,;]+\s*$/, '').replace(/\s+/g, ' ').trim();
    purposeSource = purposeSource.replace(/^purpose\s*[:=-]\s*/i, '');
    const purpose = purposeSource || text;

    let description = purpose
      .replace(/^.*?\b(?:procurement\s+of|purchase\s+of|procure|buying|for\s+the\s+procurement\s+of)\s+/i, '')
      .replace(/\s+for\s+(?:(?:the\s+)?\d+(?:st|nd|rd|th)\s+semester\s+)?[^,;]+?\s+(?:courses?|classes|students?)\s*$/i, '')
      .trim()
      .replace(/[,;:]+\s*$/, '');
    if (!description) description = purpose.slice(0, 500);

    const total = quantity * unitCost;
    return {
      department,
      purpose,
      items: [{
        item_description: description.slice(0, 500) || 'Procurement Item',
        quantity,
        unit,
        unit_cost: unitCost,
        total_cost: total,
      }],
      total_amount: total,
    };
  }

  const items = [];
  const lines = text.split(/[.;\n]/).filter((line) => line.trim().length > 3);
  for (const line of lines) {
    const match = line.match(/(\d+)\s*([a-zA-Z]+)?\s*([^@\d]+?)(?:(?:at|@|costing|cost)\s*(?:₱|PHP|Php)?\s*([\d,]+(?:\.\d+)?))?$/i);
    if (!match) continue;
    const quantity = Math.max(0, parseInt(match[1], 10) || 0);
    const unit = normalizedUnit(match[2] || 'pcs');
    const description = (match[3] || line).trim();
    const unitCost = Math.max(0, parseFloat(String(match[4] || '0').replace(/,/g, '')) || 0);
    if (description.length > 2) {
      items.push({
        item_description: description.slice(0, 500),
        quantity,
        unit,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
      });
    }
  }

  if (!items.length) {
    const qtyMatch = text.match(/\b(\d+)\b/);
    const quantity = qtyMatch ? Math.max(0, parseInt(qtyMatch[1], 10) || 0) : 1;
    const costMatch = text.match(/(?:₱|PHP|Php)?\s*([\d,]+)(?:\.\d+)?/);
    const unitCost = costMatch ? Math.max(0, parseFloat(costMatch[1].replace(/,/g, '')) || 0) : 0;
    items.push({
      item_description: text.trim().slice(0, 100),
      quantity,
      unit: 'pcs',
      unit_cost: unitCost,
      total_cost: quantity * unitCost,
    });
  }

  const purpose = removeCaseInsensitive(text, department).replace(/^[\s,;]+|[\s,;.]+$/g, '').trim() || text;
  return {
    department,
    purpose,
    items,
    total_amount: items.reduce((sum, item) => sum + item.total_cost, 0),
  };
}

function hasCompletePRDetails(extracted) {
  if (!extracted || typeof extracted !== 'object') return false;
  if (!String(extracted.department || '').trim() || !String(extracted.purpose || '').trim()) return false;
  if (!Array.isArray(extracted.items) || extracted.items.length === 0) return false;
  return extracted.items.every((item) =>
    String(item && item.item_description || '').trim().length > 2 &&
    Number(item && item.quantity) > 0 &&
    String(item && item.unit || '').trim().length > 0 &&
    Number(item && item.unit_cost) > 0
  );
}

module.exports = { extractPRDetailsRuleBased, hasCompletePRDetails };
