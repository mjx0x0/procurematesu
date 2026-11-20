'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const retrieval = fs.readFileSync(path.join(root, 'lib/document-retrieval.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'app/api/chat/route.ts'), 'utf8');

test('PR validation-failure questions have targeted PMO evidence retrieval', () => {
  assert.match(retrieval, /const asksPrValidationFailure/);
  for (const phrase of ['Verification Against PPMP/APP','Validation by the PMO Director','Pre-Numbering and Control of PRs','Endorsement to Budget Management Office','Incomplete or Incorrect Documentation','may lead to reprocessing']) {
    assert.ok(retrieval.includes(phrase), 'missing retrieval phrase: ' + phrase);
  }
});
test('Gab AI does not invent a formal PR rejection or return procedure', () => {
  assert.match(route, /PR VALIDATION FAILURE AND PPMP\/APP MISMATCH/);
  assert.match(route, /does not define whether it is returned, held, or rejected/i);
  assert.match(route, /Do NOT claim that a PR is formally rejected, returned to the end-user, placed on hold, cancelled/i);
  assert.match(route, /Do not turn the general risk statement about reprocessing into a mandatory return-and-resubmit procedure/i);
});
test('PR/PPMP answers are constrained to relevant evidence and explicit evidence boundaries', () => {
  assert.match(route, /QUESTION RELEVANCE/);
  assert.match(route, /EVIDENCE BOUNDARIES/);
  assert.match(route, /Separate \(1\) what the source expressly states, \(2\) a clearly labeled workflow inference, and \(3\) what the source does not establish/i);
});
