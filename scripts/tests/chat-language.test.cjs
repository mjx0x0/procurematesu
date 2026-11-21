const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const language = fs.readFileSync(path.join(root, 'lib/chat-language.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'app/api/chat/send/route.ts'), 'utf8');

test('Tagalog translation is detected for common Filipino requests', () => {
  assert.match(language, /isalin\\s\+mo/);
  assert.match(language, /paki\\(\\?:\\[- \\]\\?\\)\\?translate/);
  assert.match(language, /tagalog\|filipino/);
});

test('translation prompt protects procurement facts and references', () => {
  assert.match(language, /legal qualification/);
  assert.match(language, /section\\/subsection number/);
  assert.match(language, /source URL/);
  assert.match(language, /Do not add, remove, strengthen, weaken, or reinterpret/);
});

test('translation uses the latest persisted assistant answer from the verified session', () => {
  assert.match(route, /isTagalogTranslationRequest\\(message\\)/);
  assert.match(route, /\\[\\.\\.\\.priorMessages\\]\\.reverse\\(\\)/);
  assert.match(route, /entry\\.sender === 'ai'/);
  assert.match(route, /buildTagalogTranslationPrompt\\(latestAssistantAnswer\\)/);
  assert.match(route, /clientToUse\\.from\\('chat_messages'\\)\\.insert/);
});
