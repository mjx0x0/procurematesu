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
    assert.match(answer, /Purchase Request|\\bPR\\b/);
  }
});

test('common Purchase Request definition phrasings receive the same answer', () => {
  const phrasings = [
    'what is PR?',
    'What is a PR?',
    'What is the PR?',
    'what does PR mean?',
    'What does PR stand for?',
    'Define PR.',
    'Explain PR',
    'What is a Purchase Request?',
    'What does Purchase Request mean?',
    'Define the Purchase Request',
  ];

  const expected = buildCommonProcurementDefinitionAnswer('what is PR?');
  assert.ok(expected);
  assert.match(expected, /PR stands for Purchase Request/);
  assert.match(expected, /internal document/);
  assert.match(expected, /end-user unit/);

  for (const message of phrasings) {
    assert.equal(buildCommonProcurementDefinitionAnswer(message), expected, message);
  }
});

test('PR requirements, workflow, and comparison questions remain on the knowledge-base path', () => {
  for (const message of [
    'What are the requirements for a PR?',
    'How do I prepare a PR?',
    'What is the PR approval process?',
    'What is the difference between PR and PPMP?',
    'Compare Purchase Request versus PPMP.',
  ]) {
    assert.equal(buildCommonProcurementDefinitionAnswer(message), null, message);
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
