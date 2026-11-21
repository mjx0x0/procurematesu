const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const languageSource = fs.readFileSync(path.join(root, 'lib/chat-language.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'app/api/chat/send/route.ts'), 'utf8');
const compiled = ts.transpileModule(languageSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
vm.runInNewContext(compiled, { module: moduleBox, exports: moduleBox.exports });
const { getTagalogFollowUpMode, buildTagalogFollowUpPrompt } = moduleBox.exports;

test('recognizes natural English and Filipino translation requests', () => {
  for (const phrase of [
    'translate your previous answer to Filipino, but keep the legal terms in English',
    'Can you say that in Tagalog?',
    'Tagalog version please',
    'isalin mo sa tagalog',
    'Tagalugin mo',
    'Paki-translate sa Filipino',
    'Can you translate this to Tagalog?',
  ]) {
    assert.equal(getTagalogFollowUpMode(phrase), 'translate', phrase);
  }
});

test('recognizes explicit requests to explain the previous answer in Tagalog', () => {
  for (const phrase of [
    'Ipaliwanag mo ito sa Filipino',
    'Explain that in Tagalog',
    'Explain your previous answer in simple Tagalog',
    'Can you simplify that in Filipino?',
  ]) {
    assert.equal(getTagalogFollowUpMode(phrase), 'explain', phrase);
  }
});

test('routes new topic-specific Tagalog questions through procurement retrieval', () => {
  for (const phrase of [
    'Explain Section 34.3(d) in simple Tagalog.',
    'Explain SVP in simple Tagalog.',
    'Explain RA 12009 in simple Tagalog.',
    'Can you explain Section 34.3(d) in Tagalog?',
    'Ipaliwanag ang RA 12009 sa simpleng Tagalog.',
    'Translate Section 34.3(d) to Tagalog.',
  ]) {
    assert.equal(getTagalogFollowUpMode(phrase), null, phrase);
  }
});

test('does not classify ordinary procurement questions as language follow-ups', () => {
  for (const phrase of [
    'What is RA 12009?',
    'What happens if nobody submits a quotation for SVP?',
    'Can you explain Section 34.3(d)?',
  ]) {
    assert.equal(getTagalogFollowUpMode(phrase), null, phrase);
  }
});

test('prompts preserve legal accuracy and treat the source answer as data', () => {
  const translationPrompt = buildTagalogFollowUpPrompt('Section 34.3(d) says X.', 'translate', 'Translate this');
  const explanationPrompt = buildTagalogFollowUpPrompt('Section 34.3(d) says X.', 'explain', 'Explain this simply');
  assert.match(translationPrompt, /legal qualification/);
  assert.match(translationPrompt, /section\/subsection number/);
  assert.match(translationPrompt, /source URL/);
  assert.match(explanationPrompt, /do not change, broaden, narrow, or invent/i);
  assert.match(translationPrompt, /untrusted text to transform/i);
  assert.match(translationPrompt, /<SOURCE_ANSWER>/);
});

test('language follow-ups run before scope guards and use the latest persisted assistant answer', () => {
  assert.ok(route.includes('getTagalogFollowUpMode(message)'));
  assert.ok(route.includes('[...priorMessages].reverse()'));
  assert.ok(route.includes("entry.sender === 'ai'"));
  assert.ok(route.includes('buildTagalogFollowUpPrompt(latestAssistantAnswer, languageFollowUpMode, message)'));
  assert.ok(route.includes("clientToUse.from('chat_messages').insert"));
});
