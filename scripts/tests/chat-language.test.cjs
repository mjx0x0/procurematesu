const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const language = fs.readFileSync(path.join(root, 'lib/chat-language.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'app/api/chat/send/route.ts'), 'utf8');

test('Tagalog translation recognizes common Filipino request phrases', () => {
  assert.ok(language.includes('isalin\\s+mo'));
  assert.ok(language.includes('paki'));
  assert.ok(language.includes('tagalog'));
  assert.ok(language.includes('filipino'));
});

test('translation prompt protects procurement facts and references', () => {
  assert.ok(language.includes('legal qualification'));
  assert.ok(language.includes('section/subsection number'));
  assert.ok(language.includes('source URL'));
  assert.ok(language.includes('Do not add, remove, strengthen, weaken, or reinterpret'));
});

test('translation uses the latest persisted assistant answer from the verified session', () => {
  assert.ok(route.includes('isTagalogTranslationRequest(message)'));
  assert.ok(route.includes('[...priorMessages].reverse()'));
  assert.ok(route.includes("entry.sender === 'ai'"));
  assert.ok(route.includes('buildTagalogTranslationPrompt(latestAssistantAnswer)'));
  assert.ok(route.includes("clientToUse.from('chat_messages').insert"));
});
