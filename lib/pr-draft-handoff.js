'use strict';

const { normalizeMSUDepartment } = require('./procurement-departments.js');

const PR_DRAFT_HANDOFF_VERSION = 1;
const MAX_HANDOFF_TOKEN_LENGTH = 50000;

function createPRDraftHandoffPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('The Purchase Request draft data is invalid.');
  }

  const department = normalizeMSUDepartment(input.department);
  const purpose = String(input.purpose || '').trim();
  if (!department) throw new Error('The chatbot draft is missing the requesting department.');
  if (!purpose) throw new Error('The chatbot draft is missing the procurement purpose.');

  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) {
    throw new Error('The chatbot draft must contain between 1 and 100 items.');
  }

  const items = input.items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Item ' + (index + 1) + ' has invalid data.');
    }

    const itemDescription = String(item.item_description ?? item.description ?? '').trim();
    const quantity = Number(item.quantity ?? item.qty);
    const unit = String(item.unit || '').trim();
    const unitCost = Number(item.unit_cost ?? item.unitCost);

    if (itemDescription.length < 3) {
      throw new Error('Item ' + (index + 1) + ' is missing a valid description.');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Item ' + (index + 1) + ' is missing a valid quantity.');
    }
    if (!unit) {
      throw new Error('Item ' + (index + 1) + ' is missing a unit of measurement.');
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      throw new Error('Item ' + (index + 1) + ' is missing a valid estimated unit cost.');
    }

    const totalCost = quantity * unitCost;
    if (!Number.isFinite(totalCost)) {
      throw new Error('Item ' + (index + 1) + ' has an invalid computed total.');
    }

    return {
      item_description: itemDescription,
      quantity,
      unit,
      unit_cost: unitCost,
      total_cost: totalCost,
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);
  if (!Number.isFinite(totalAmount)) {
    throw new Error('The Purchase Request total could not be calculated.');
  }

  return {
    version: PR_DRAFT_HANDOFF_VERSION,
    department,
    purpose,
    items,
    total_amount: totalAmount,
  };
}

function encodePRDraftHandoff(input) {
  const payload = createPRDraftHandoffPayload(input);
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePRDraftHandoff(token) {
  const encoded = String(token || '').trim();
  if (!encoded || encoded.length > MAX_HANDOFF_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error('The chatbot draft link is invalid or incomplete. Please return to the chatbot and generate the draft again.');
  }

  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed = JSON.parse(json);

    if (parsed.version !== PR_DRAFT_HANDOFF_VERSION) {
      throw new Error('This chatbot draft link uses an unsupported version.');
    }

    return createPRDraftHandoffPayload(parsed);
  } catch (error) {
    if (error instanceof Error && /unsupported version|invalid|missing|valid|between|could not be calculated/i.test(error.message)) {
      throw error;
    }
    throw new Error('The chatbot draft link could not be read. Please return to the chatbot and generate the draft again.');
  }
}

function readPRDraftHandoff(searchParams) {
  if (!searchParams || typeof searchParams.get !== 'function') return null;

  const token = searchParams.get('draft');
  if (token) return decodePRDraftHandoff(token);

  // Backward compatibility for links created before the versioned handoff.
  const department = searchParams.get('department');
  const purpose = searchParams.get('purpose');
  const itemsParam = searchParams.get('items');
  const totalParam = searchParams.get('total');
  if (!department && !purpose && !itemsParam && !totalParam) return null;

  let items;
  try {
    items = itemsParam ? JSON.parse(itemsParam) : [];
  } catch {
    throw new Error('The older chatbot draft link contains unreadable item details. Please return to the chatbot and generate the draft again.');
  }

  return createPRDraftHandoffPayload({ department, purpose, items });
}

module.exports = {
  PR_DRAFT_HANDOFF_VERSION,
  createPRDraftHandoffPayload,
  encodePRDraftHandoff,
  decodePRDraftHandoff,
  readPRDraftHandoff,
};
