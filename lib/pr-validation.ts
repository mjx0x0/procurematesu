export type PRValidationErrors = Record<string, string>;

const COMMON_UNITS = new Set([
  'pc', 'pcs', 'piece', 'pieces', 'unit', 'units', 'set', 'sets', 'box', 'boxes', 'ream', 'reams',
  'bottle', 'bottles', 'pack', 'packs', 'pair', 'pairs', 'roll', 'rolls', 'lot', 'lots', 'kg', 'g',
  'mg', 'l', 'liter', 'liters', 'ml', 'meter', 'meters', 'cm', 'mm', 'dozen', 'dozens', 'bundle',
  'bundles', 'kit', 'kits', 'hour', 'hours', 'day', 'days', 'month', 'months', 'year', 'years',
  'job', 'jobs', 'trip', 'trips', 'license', 'licenses', 'subscription', 'subscriptions', 'service', 'services',
]);

function looksGibberish(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return true;
  const letters = (text.match(/[a-z]/g) || []).length;
  const words = text.split(/\s+/).filter(Boolean);
  if (letters < 2 || words.length === 0) return true;
  if (/(.)\1{4,}/.test(text)) return true;
  if (letters >= 5 && !/[aeiou]/.test(text)) return true;
  const consonants = (text.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  if (letters >= 8 && consonants / letters > 0.9) return true;
  return false;
}

function cleanWords(value: string) { return value.trim().split(/\s+/).filter(Boolean); }

export function validateDraftInput(value: string): string | null {
  const text = value.trim();
  if (text.length < 12 || cleanWords(text).length < 3) return 'Please describe the procurement clearly. A random or incomplete answer cannot be used for PR drafting.';
  if (looksGibberish(text)) return 'That answer appears to contain random or invalid text. Please provide a meaningful procurement description.';
  const procurementTerms = /\b(need|needs|purchase|purchases|procure|procurement|buy|buying|acquire|acquisition|supply|supplies|equipment|materials?|office|laboratory|laboratories|school|college|department|laptop|computer|printer|paper|furniture|vehicle|service|services|repair|maintenance|training|seminar|software|license|classroom|research|project|program|operations)\b/i;
  if (!procurementTerms.test(text)) return 'That does not appear to describe a procurement need. Please state what you need to purchase/procure and why.';
  return null;
}

export function validatePurchaseRequest(input: {
  purpose: string; department: string; section?: string; requestedBy: string; designation?: string;
  items: Array<{ description: string; qty: number; unit: string; unit_cost: number }>;
}): PRValidationErrors {
  const errors: PRValidationErrors = {};
  const purpose = input.purpose.trim(); const department = input.department.trim(); const section = (input.section || '').trim();
  const requestedBy = input.requestedBy.trim(); const designation = (input.designation || '').trim();
  const purposeRelevant = /\b(purchase|procure|procurement|buy|acquire|need|supply|supplies|equipment|materials?|office|laboratory|classroom|teaching|instruction|learning|research|project|program|operations|activities|event|seminar|training|repair|maintenance|service|services|replace|replacement|use|support)\b/i;
  const departmentRelevant = /\b(college|school|department|office|unit|laboratory|lab|faculty|institute|center|division|administration|program|section|campus|library|registrar|accounting|finance|engineering|education|science|business|nursing|research|graduate|ict|hr|human\s+resources)\b/i;

  if (purpose.length < 10 || cleanWords(purpose).length < 3) errors.purpose = 'Please provide a complete procurement purpose or description, not a short/random phrase.';
  else if (looksGibberish(purpose) || !purposeRelevant.test(purpose)) errors.purpose = 'The purpose appears unrelated or invalid. Describe what the procurement is for and how it will be used.';
  if (department.length < 2 || looksGibberish(department) || (!departmentRelevant.test(department) && cleanWords(department).length < 2)) errors.department = 'Please enter a valid department, college, office, laboratory, or university unit.';
  if (section && looksGibberish(section)) errors.section = 'Please enter a valid section/unit name, or leave this field blank.';
  if (!requestedBy || requestedBy.includes('@') || cleanWords(requestedBy).length < 2 || looksGibberish(requestedBy)) errors.requestedBy = 'Please enter your actual full name.';
  if (designation && looksGibberish(designation)) errors.designation = 'Please enter a valid designation or leave it blank.';
  if (!input.items.length) errors.items = 'Add at least one procurement item.';
  else input.items.forEach((item, index) => {
    const description = item.description.trim(); const unit = item.unit.trim().toLowerCase();
    if (description.length < 3 || looksGibberish(description)) errors[`item_${index}_description`] = `Item ${index + 1}: enter a meaningful item description.`;
    if (!Number.isFinite(item.qty) || item.qty < 1) errors[`item_${index}_qty`] = `Item ${index + 1}: quantity must be at least 1.`;
    if (!COMMON_UNITS.has(unit)) errors[`item_${index}_unit`] = `Item ${index + 1}: enter a recognized unit such as pcs, sets, boxes, reams, kg, liters, or service.`;
    if (!Number.isFinite(item.unit_cost) || item.unit_cost < 0) errors[`item_${index}_cost`] = `Item ${index + 1}: unit cost must be a valid amount.`;
  });
  return errors;
}

export function firstValidationError(errors: PRValidationErrors) { return Object.values(errors)[0] || null; }
