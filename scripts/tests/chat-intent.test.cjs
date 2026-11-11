'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyProcurementIntent,
  extractPRIdentifier,
  isExplicitPRCreationRequest,
  isProcurementInformationQuestion,
} = require('../../lib/chat-intent.js');

test('explicit natural-language preparation requests start PR slot filling', () => {
  const requests = [
    'Help me prepare a Purchase Request for 30 laboratory microscopes.',
    'Can you help me create a PR?',
    'I need to prepare a new purchase request.',
    'Please draft a PR for laboratory supplies.',
    'Could you assist us in filling out a Purchase Request?',
    'Create a PR with these details: 30 microscopes at ₱8,500 each.',
  ];
  for (const request of requests) {
    assert.equal(isExplicitPRCreationRequest(request), true, request);
    assert.equal(classifyProcurementIntent(request), 'create_pr_draft', request);
  }
});

test('informational questions about PR preparation remain in procurement Q&A', () => {
  const questions = [
    'How do I prepare a Purchase Request?',
    'What are the requirements for creating a PR?',
    'What documents do I need to attach to a Purchase Request?',
    'Which supporting documents are required for a PR?',
    'Can I submit a PR without an approved PPMP?',
    'What is the purpose of the PPMP?',
  ];
  for (const question of questions) {
    assert.equal(isProcurementInformationQuestion(question), true, question);
    assert.equal(classifyProcurementIntent(question), 'procurement_question', question);
  }
});

test('active draft field replies and completed-draft revisions remain distinct', () => {
  assert.equal(classifyProcurementIntent('College of Education (CED)', { activeDraft: true }), 'draft_continuation');
  assert.equal(classifyProcurementIntent('What are the PR requirements under RA 12009?', { activeDraft: true }), 'procurement_question');
  assert.equal(classifyProcurementIntent('30 pcs laboratory glassware at ₱150 each', { activeDraft: true }), 'draft_continuation');
  assert.equal(classifyProcurementIntent('Change item 1 quantity to 60 pcs', { draftReady: true }), 'draft_revision');
});

test('explicit new draft requests take precedence over an existing draft', () => {
  assert.equal(
    classifyProcurementIntent('Help me prepare a new Purchase Request.', { activeDraft: true }),
    'create_pr_draft'
  );
});

test('tracking and PR-list requests do not enter slot filling', () => {
  assert.equal(classifyProcurementIntent('Track PR-TEMP-2026-0019', { activeDraft: true }), 'track_pr');
  assert.equal(classifyProcurementIntent('Show me my submitted PRs', { activeDraft: true }), 'list_prs');
  assert.equal(extractPRIdentifier('Please track PR‑TEMP‑2026‑0019.'), 'PR-TEMP-2026-0019');
});

test('ordinary procurement statements do not automatically create a PR draft', () => {
  assert.equal(classifyProcurementIntent('The university needs laboratory microscopes.'), 'general');
  assert.equal(classifyProcurementIntent('Tell me about RA 12009.'), 'procurement_question');
  assert.equal(classifyProcurementIntent('Help me draft a PR'), 'create_pr_draft');
});


test('natural microscope request extracts quantity and explicit unit cost without inventing its purpose', () => {
  const { extractPRDetailsRuleBased } = require('../../lib/pr-draft-extraction.js');
  const extracted = extractPRDetailsRuleBased(
    'Help me prepare a Purchase Request for 30 laboratory microscopes with an estimated unit cost of ₱8,500.'
  );

  assert.equal(extracted.purpose, null);
  assert.equal(extracted.items.length, 1);
  assert.equal(extracted.items[0].item_description, 'laboratory microscopes');
  assert.equal(extracted.items[0].quantity, 30);
  assert.equal(extracted.items[0].unit, 'units');
  assert.equal(extracted.items[0].unit_cost, 8500);
  assert.equal(extracted.items[0].total_cost, 255000);
  assert.equal(extracted.total_amount, 255000);
});


test('natural microscope request treats item data as item data, not purpose', () => {
  const { extractPRDetailsRuleBased } = require('../../lib/pr-draft-extraction.js');
  const priced = extractPRDetailsRuleBased(
    'Help me prepare a Purchase Request for 30 laboratory microscopes with an estimated unit cost of ₱8,500.'
  );
  assert.equal(priced.purpose, null);
  assert.equal(priced.items.length, 1);
  assert.equal(priced.items[0].item_description, 'laboratory microscopes');
  assert.equal(priced.items[0].quantity, 30);
  assert.equal(priced.items[0].unit, 'units');
  assert.equal(priced.items[0].unit_cost, 8500);
  assert.equal(priced.items[0].total_cost, 255000);
  assert.equal(priced.total_amount, 255000);

  const unpriced = extractPRDetailsRuleBased('Help me prepare a Purchase Request for 30 laboratory microscopes.');
  assert.equal(unpriced.purpose, null);
  assert.equal(unpriced.items.length, 1);
  assert.equal(unpriced.items[0].quantity, 30);
  assert.equal(unpriced.items[0].unit_cost, 0);
  assert.equal(unpriced.items[0].total_cost, 0);
});


test('natural quantity and item name take precedence over the price-only fallback', () => {
  const { extractPRDetailsRuleBased } = require('../../lib/pr-draft-extraction.js');
  const extracted = extractPRDetailsRuleBased(
    'Help me prepare a Purchase Request for 30 laboratory microscopes with an estimated unit cost of ₱8,500.'
  );
  assert.equal(extracted.purpose, null);
  assert.equal(extracted.items.length, 1);
  assert.equal(extracted.items[0].item_description, 'laboratory microscopes');
  assert.equal(extracted.items[0].quantity, 30);
  assert.equal(extracted.items[0].unit, 'units');
  assert.equal(extracted.items[0].unit_cost, 8500);
  assert.equal(extracted.items[0].total_cost, 255000);
  assert.equal(extracted.total_amount, 255000);
});


test('vague requests for help with a PR ask one clarification instead of starting slot filling', () => {
  for (const message of [
    'Help me with a PR',
    'Can you help me with my Purchase Request?',
    'I need help with a PR.',
  ]) {
    assert.equal(classifyProcurementIntent(message), 'clarify_pr_intent', message);
  }
});

test('specific requests to prepare or fill a PR still start slot filling', () => {
  for (const message of [
    'I need help preparing a PR.',
    'Help me with preparing a Purchase Request.',
    'Can you help me fill out a PR?',
  ]) {
    assert.equal(classifyProcurementIntent(message), 'create_pr_draft', message);
  }
});

test('questions about PR instructions remain informational even when phrased as help requests', () => {
  for (const message of [
    'How do I prepare a PR?',
    'Can you help me understand the PR requirements?',
    'What documents do I need for a Purchase Request?',
  ]) {
    assert.equal(classifyProcurementIntent(message), 'procurement_question', message);
  }
});

test('the ambiguity response is explicit about the two supported paths', () => {
  const { PR_INTENT_CLARIFICATION_RESPONSE } = require('../../lib/chat-intent.js');
  assert.match(PR_INTENT_CLARIFICATION_RESPONSE, /explain PR requirements and procedures/i);
  assert.match(PR_INTENT_CLARIFICATION_RESPONSE, /start preparing a Purchase Request draft/i);
});


test('both chat entry points keep a completed PR draft in scope for valid revisions', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const legacyRoute = fs.readFileSync(path.join(__dirname, '../../app/api/chat/route.ts'), 'utf8');
  const sendRoute = fs.readFileSync(path.join(__dirname, '../../app/api/chat/send/route.ts'), 'utf8');

  assert.match(legacyRoute, /activePRDraft: Boolean\(currentState\.drafting \|\| currentState\.draftReady\)/);
  assert.match(sendRoute, /activePRDraft: Boolean\(draftState\.drafting \|\| draftState\.draftReady\)/);
  assert.match(legacyRoute, /chatIntent === 'clarify_pr_intent'/);
  assert.match(sendRoute, /messageIntent === 'clarify_pr_intent'/);
});


test('completed draft corrections remain detectable for legacy sessions without a draftReady flag', () => {
  const { isCompletedPRDraftEdit } = require('../../lib/pr-draft-extraction.js');
  const legacyCompletedState = {
    drafting: false,
    step: null,
    collected: {
      purpose: 'Procurement of laboratory glassware for Chemistry classes',
      department: 'College of Education (CED)',
      extracted: {
        purpose: 'Procurement of laboratory glassware for Chemistry classes',
        department: 'College of Education (CED)',
        items: [{ item_description: 'laboratory glassware', quantity: 50, unit: 'pcs', unit_cost: 150, total_cost: 7500 }],
        total_amount: 7500,
      },
    },
  };
  assert.equal(Object.prototype.hasOwnProperty.call(legacyCompletedState, 'draftReady'), false);
  assert.equal(isCompletedPRDraftEdit(legacyCompletedState, 'Change the quantity from 50 pcs to 60 pcs.'), true);
});
