'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateSourceUrl,
  extractReferencedSourceNames,
  buildSourceReferenceEntries,
  buildReferenceLinksResponse,
} = require('../../lib/chat-source-references.js');

const context = [
  'User: Is it different from PR?',
  'Gab AI: PPMP is a planning document. References • PMO Administrative Manual, IV. PROCESS FLOW (PDF page 12) – verification of PR against PPMP/APP.',
].join('\n');

test('only valid HTTP(S) source URLs are accepted', () => {
  assert.equal(validateSourceUrl('https://gppb.gov.ph/source.pdf'), 'https://gppb.gov.ph/source.pdf');
  assert.equal(validateSourceUrl('http://example.org/manual.pdf'), 'http://example.org/manual.pdf');
  assert.equal(validateSourceUrl('javascript:alert(1)'), '');
  assert.equal(validateSourceUrl('file:///private/manual.pdf'), '');
  assert.equal(validateSourceUrl('not-a-url'), '');
  assert.equal(validateSourceUrl('https://user:pass@example.org/file.pdf'), '');
});

test('reference title is recovered from the recent References section', () => {
  assert.deepEqual(extractReferencedSourceNames(context), ['PMO Administrative Manual']);
});

test('only the cited source is linked and metadata page/section details are retained', () => {
  const chunks = [
    {
      document_name: 'PMO Administrative Manual',
      metadata: {
        source_url: 'https://files.example.test/pmo-manual.pdf',
        section: 'IV. PROCESS FLOW',
        pdf_page: 12,
      },
    },
    {
      document_name: 'Unrelated procurement reference',
      metadata: { source_url: 'https://files.example.test/other.pdf' },
    },
  ];
  const entries = buildSourceReferenceEntries(chunks, context);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].documentName, 'PMO Administrative Manual');
  assert.equal(entries[0].url, 'https://files.example.test/pmo-manual.pdf');
  assert.deepEqual(entries[0].sections, ['IV. PROCESS FLOW']);
  assert.deepEqual(entries[0].pages, ['12']);

  const response = buildReferenceLinksResponse(chunks, context);
  assert.match(response, /\[PMO Administrative Manual\]\(https:\/\/files\.example\.test\/pmo-manual\.pdf\)/);
  assert.match(response, /IV\. PROCESS FLOW/);
  assert.match(response, /PDF page 12/);
});

test('missing links are disclosed rather than fabricated', () => {
  const response = buildReferenceLinksResponse([
    { document_name: 'PMO Administrative Manual', metadata: { section: 'IV. PROCESS FLOW', pdf_page: 12 } },
  ], context);
  assert.match(response, /no shareable URL is currently stored/i);
  assert.match(response, /will not guess or fabricate a link/i);
  assert.doesNotMatch(response, /https?:\/\//);
});

test('missing retrieval rows still produce an honest unavailable-link message for cited titles', () => {
  const response = buildReferenceLinksResponse([], context);
  assert.match(response, /PMO Administrative Manual/);
  assert.match(response, /no shareable URL is currently stored/i);
});
