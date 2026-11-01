'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  createPRDraftHandoffPayload,
  encodePRDraftHandoff,
  decodePRDraftHandoff,
  readPRDraftHandoff,
} = require('../../lib/pr-draft-handoff.js');

const exampleDraft = {
  department: 'College of Education',
  purpose: 'Procurement of laboratory glassware and supplies for 1st Semester Chemistry courses',
  items: [{
    item_description: 'laboratory glassware',
    quantity: 50,
    unit: 'pcs',
    unit_cost: 150,
    total_cost: 1, // Stale incoming totals must never override a recalculation.
  }],
  total_amount: 1,
};

test('the exact chatbot example round-trips every field through the New PR Form URL', () => {
  const token = encodePRDraftHandoff(exampleDraft);
  const url = new URL('https://procurematesu.test/dashboard/new-pr?draft=' + token);
  const parsed = readPRDraftHandoff(url.searchParams);

  assert.equal(url.pathname, '/dashboard/new-pr');
  assert.equal(parsed.department, 'College of Education (CED)');
  assert.equal(parsed.purpose, exampleDraft.purpose);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].item_description, 'laboratory glassware');
  assert.equal(parsed.items[0].quantity, 50);
  assert.equal(parsed.items[0].unit, 'pcs');
  assert.equal(parsed.items[0].unit_cost, 150);
  assert.equal(parsed.items[0].total_cost, 7500);
  assert.equal(parsed.total_amount, 7500);
});

test('all item rows survive handoff, including punctuation, Unicode, and ampersands', () => {
  const input = {
    department: 'College of Natural Sciences and Mathematics',
    purpose: 'Procurement of glassware, reagents & measuring tools (Chemistry Lab)',
    items: [
      { item_description: 'Borosilicate beakers (250 mL)', quantity: 12, unit: 'pcs', unit_cost: 85.5 },
      { item_description: 'pH buffer solution — pH 7.00', quantity: 3, unit: 'bottles', unit_cost: 420 },
      { item_description: 'Laboratory gloves, nitrile', quantity: 5, unit: 'boxes', unit_cost: 180 },
    ],
  };
  const payload = decodePRDraftHandoff(encodePRDraftHandoff(input));

  assert.equal(payload.department, 'College of Natural Sciences and Mathematics (CNSM)');
  assert.equal(payload.purpose, input.purpose);
  assert.deepEqual(payload.items.map((item) => item.item_description), input.items.map((item) => item.item_description));
  assert.deepEqual(payload.items.map((item) => item.quantity), [12, 3, 5]);
  assert.deepEqual(payload.items.map((item) => item.unit_cost), [85.5, 420, 180]);
  assert.equal(payload.total_amount, (12 * 85.5) + (3 * 420) + (5 * 180));
});

test('legacy department/purpose/items query links still prefill correctly', () => {
  const params = new URLSearchParams({
    department: 'College of Education',
    purpose: exampleDraft.purpose,
    items: JSON.stringify(exampleDraft.items),
    total: '999999',
  });
  const payload = readPRDraftHandoff(params);

  assert.equal(payload.department, 'College of Education (CED)');
  assert.equal(payload.items[0].quantity, 50);
  assert.equal(payload.total_amount, 7500);
});

test('legacy item aliases description and qty are normalized', () => {
  const params = new URLSearchParams({
    department: 'College of Education (CED)',
    purpose: 'Procurement of laboratory glassware',
    items: JSON.stringify([{ description: 'Beakers', qty: 4, unit: 'pcs', unit_cost: 25 }]),
  });
  const payload = readPRDraftHandoff(params);

  assert.deepEqual(payload.items[0], {
    item_description: 'Beakers',
    quantity: 4,
    unit: 'pcs',
    unit_cost: 25,
    total_cost: 100,
  });
});

test('malformed and incomplete chatbot handoffs fail visibly instead of silently prefilling blanks', () => {
  assert.throws(() => decodePRDraftHandoff('not a valid token!'), /invalid or incomplete/i);
  assert.throws(() => decodePRDraftHandoff('eyJ2ZXJzaW9uIjoyfQ'), /unsupported version/i);
  assert.throws(() => createPRDraftHandoffPayload({ ...exampleDraft, items: [] }), /between 1 and 100/i);
  assert.throws(() => createPRDraftHandoffPayload({
    ...exampleDraft,
    items: [{ item_description: '', quantity: 50, unit: 'pcs', unit_cost: 150 }],
  }), /description/i);
  assert.throws(() => createPRDraftHandoffPayload({
    ...exampleDraft,
    items: [{ item_description: 'glassware', quantity: 0, unit: 'pcs', unit_cost: 150 }],
  }), /quantity/i);
});

test('no chatbot handoff parameters return null', () => {
  assert.equal(readPRDraftHandoff(new URLSearchParams()), null);
});
