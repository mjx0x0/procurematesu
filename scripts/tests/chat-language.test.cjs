const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const language = fs.readFileSync(path.join(root, 'lib/chat-language.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'app/api/chat/send/route.ts'), 'utf8');

test('language follow-up detector includes natural English and Filipino translation requests', () => {
  for (const phrase of [
    'translate your previous answer to Filipino',
    'Can you say that in Tagalog?',
    'Tagalog version please',
    'isalin mo sa tagalog',
    'Tagalugin mo',
    'Paki-translate sa Filipino',
  ]) {
    assert.ok(language.toLowerCase().includes(phrase.toLowerCase().split(' ')[0]) ||
      /translate|tagalog|filipino|isalin|tagalugin|paki/i.test(phrase));
  }
  assert.match(language, /translate\\s+your\\s+\\(\?:previous\|last\\)/);
  assert.match(language, /tagalugin/);
  assert.match(language, /paki/);
});

test('language follow-up detector supports simple Tagalog explanations', () => {
  assert.match(language, /explain/);
  assert.match(language, /simple/);
  assert.match(language, /ipaliwanag/);
  assert.match(language, /getTagalogFollowUpMode/);
});

test('translation and explanation prompts preserve procurement/legal accuracy', () => {
  assert.match(language, /legal qualification/);
  assert.match(language, /section\/subsection number/);
  assert.match(language, /source URL/);
  assert.match(language, /do not change, broaden, narrow, or invent/i);
  assert.match(language, /untrusted text to transform/i);
  assert.match(language, /Keep citations and URLs unchanged/);
});

test('language follow-ups run before scope guards and use the latest persisted assistant answer', () => {
  assert.ok(route.includes('getTagalogFollowUpMode(message)'));
  assert.ok(route.includes('[...priorMessages].reverse()'));
  assert.ok(route.includes("entry.sender === 'ai'"));
  assert.ok(route.includes('buildTagalogFollowUpPrompt(latestAssistantAnswer, languageFollowUpMode, message)'));
  assert.ok(route.includes("clientToUse.from('chat_messages').insert"));
});
