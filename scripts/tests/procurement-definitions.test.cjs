'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCommonProcurementDefinitionAnswer } = require('../../lib/procurement-definitions.js');

test('common PPMP definition phrasings receive a concise answer', () => {
  for (const message of [
    'what is PPMP',
    'What is the PPMP?',
    "What's PPMP?",
    'whats PPMP?',
    'What does PPMP stand for?',
    'Explain PPMP.',
    'Define the PPMP',
  ]) {
    const answer = buildCommonProcurementDefinitionAnswer(message);
    assert.ok(answer, message);
    assert.match(answer, /Project Procurement Management Plan/);
    assert.match(answer, /planning document/);
    assert.match(answer, /Purchase Request|\bPR\b/);
  }
});

test('comparison questions are not downgraded to a definition-only answer', () => {
  for (const message of [
    'What is the difference between PPMP and PR?',
    'Compare PPMP versus Purchase Request.',
  ]) {
    assert.equal(buildCommonProcurementDefinitionAnswer(message), null, message);
  }
});

test('the helper does not answer unrelated prompts', () => {
  assert.equal(buildCommonProcurementDefinitionAnswer('What is Python?'), null);
  assert.equal(buildCommonProcurementDefinitionAnswer('Tell me a joke about PPMP.'), null);
});
