const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EMPTY_ASSISTANT_RESPONSE,
  normalizeAssistantResponse,
  normalizeInlineMarkdown,
} = require('../../lib/chat-response-format.js');

test('empty, whitespace-only, and malformed-only AI outputs never become blank messages', () => {
  for (const value of ['', '   ', '\n\t ', '|||', '** **', '***', '---']) {
    assert.equal(normalizeAssistantResponse(value), EMPTY_ASSISTANT_RESPONSE, JSON.stringify(value));
  }
  assert.equal(normalizeAssistantResponse(null), EMPTY_ASSISTANT_RESPONSE);
  assert.equal(normalizeAssistantResponse(undefined), EMPTY_ASSISTANT_RESPONSE);
});

test('normal assistant prose is preserved and trimmed', () => {
  const response = '  The PMO Director is Nelson P. Benares, Jr.  ';
  assert.equal(normalizeAssistantResponse(response), 'The PMO Director is Nelson P. Benares, Jr.');
});

test('only actual Markdown tables are converted into readable bullets', () => {
  const table = [
    '| Requirement | Stage |',
    '| --- | --- |',
    '| PhilGEPS ID | Submission |',
    '| Mayor’s Permit | Evaluation |',
  ].join('\n');
  const normalized = normalizeAssistantResponse(table);
  assert.match(normalized, /• Requirement: PhilGEPS ID \| Stage: Submission/);
  assert.match(normalized, /• Requirement: Mayor’s Permit \| Stage: Evaluation/);
  assert.doesNotMatch(normalized, /\| --- \|/);
});

test('ordinary prose containing a pipe character is not stripped or treated as a table', () => {
  const prose = 'Use the approved process A | B only when the policy says so.';
  assert.equal(normalizeAssistantResponse(prose), prose);
});

test('HTML line breaks are converted and block tags do not concatenate paragraphs', () => {
  const normalized = normalizeAssistantResponse('<p>First paragraph.</p><p>Second paragraph.</p>');
  assert.match(normalized, /First paragraph\.\n\nSecond paragraph\./);
});

test('inline emphasis is limited to short leading labels', () => {
  assert.equal(
    normalizeInlineMarkdown('**Current Status:** Draft — awaiting printed-form receipt'),
    '**Current Status:** Draft — awaiting printed-form receipt'
  );
  assert.equal(
    normalizeInlineMarkdown('The **Director’s name** and **source title** are shown here.'),
    'The Director’s name and source title are shown here.'
  );
  assert.equal(
    normalizeInlineMarkdown('A **broken bold marker should not make the rest bold'),
    'A broken bold marker should not make the rest bold'
  );
});
