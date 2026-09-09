export type PRValidationErrors = Record<string, string>;

const COMMON_UNITS = new Set([
  'pc', 'pcs', 'piece', 'pieces', 'unit', 'units', 'set', 'sets', 'box', 'boxes',
  'ream', 'reams', 'bottle', 'bottles', 'pack', 'packs', 'pair', 'pairs', 'roll',
  'rolls', 'lot', 'lots', 'kg', 'g', 'mg', 'l', 'liter', 'liters', 'ml', 'meter',
  'meters', 'cm', 'mm', 'dozen', 'dozens', 'bundle', 'bundles', 'kit', 'kits',
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

function cleanWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

export function validatePurchaseRequest(input: {
  purpose: string;
  department: string;
  section?: string;
  requestedBy: string;
  designation?: string;
  items: Array<{ description: string; qty: number; unit: string; unit_cost: number }>;
}): PRValidationErrors {
  const errors: PRValidationErrors = {};
  const purpose = input.purpose.trim();
  const department = input.department.trim();
  const section = (input.section || '').trim();
  const requestedBy = input.requestedBy.trim();
  const designation = (input.designation || '').trim();

  if (purpose.length < 10 || cleanWords(purpose).length < 3) {
    errors.purpose = 'Please provide a complete procurement purpose or description, not a short/random phrase.';
  } else if (looksGibberish(purpose)) {
    errors.purpose = 'The purpose appears invalid or contains random text. Describe what the procurement is for.';
  }

  if (department.length < 2 || looksGibberish(department)) {
    errors.department = 'Please enter a valid department or university unit.';
  }

  if (section && looksGibberish(section)) {
    errors.section = 'Please enter a valid section/unit name, or leave this field blank.';
  }

  if (!requestedBy || requestedBy.includes('@') || cleanWords(requestedBy).length < 2 || looksGibberish(requestedBy)) {
    errors.requestedBy = 'Please enter your actual full name.';
  }

  if (designation && looksGibberish(designation)) {
    errors.designation = 'Please enter a valid designation or leave it blank.';
  }

  if (!input.items.length) {
    errors.items = 'Add at least one procurement item.';
  } else {
    input.items.forEach((item, index) => {
      const description = item.description.trim();
      const unit = item.unit.trim().toLowerCase();
      if (description.length < 3 || looksGibberish(description)) {
        errors[`item_${index}_description`] = `Item ${index + 1}: enter a meaningful item description.`;
      }
      if (!Number.isFinite(item.qty) || item.qty < 1) {
        errors[`item_${index}_qty`] = `Item ${index + 1}: quantity must be at least 1.`;
      }
      if (!unit || (!COMMON_UNITS.has(unit) && !/^[a-z][a-z -]{1,29}$/i.test(unit))) {
        errors[`item_${index}_unit`] = `Item ${index + 1}: enter a valid unit (e.g., pcs, sets, boxes, reams).`;
      }
      if (!Number.isFinite(item.unit_cost) || item.unit_cost < 0) {
        errors[`item_${index}_cost`] = `Item ${index + 1}: unit cost must be a valid amount.`;
      }
    });
  }

  return errors;
}

export function firstValidationError(errors: PRValidationErrors) {
  return Object.values(errors)[0] || null;
}
