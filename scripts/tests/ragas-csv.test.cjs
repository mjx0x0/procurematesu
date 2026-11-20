'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, serializeCsv } = require('../lib/ragas-csv.cjs');

test('CSV parser handles commas, quotes, and multiline cells', () => {
  const rows = parseCsv('question,answer\\r\\n"What, exactly?","She said ""yes"".\\nNext line"\\r\\n');
  assert.deepEqual(rows, [{ question: 'What, exactly?', answer: 'She said "yes".\\nNext line' }]);
});

test('CSV parser strips a UTF-8 BOM from the first header', () => {
  assert.deepEqual(parseCsv('\\uFEFFcategory,user_input\\nTest,Question\\n'), [{ category: 'Test', user_input: 'Question' }]);
});

test('CSV serializer escapes values and round-trips rows', () => {
  const input = [{ question: 'What, exactly?', answer: 'A "quoted" answer\\ncontinued' }];
  assert.deepEqual(parseCsv(serializeCsv(input, ['question', 'answer'])), input);
});

test('parser rejects unterminated quotes and duplicate headers', () => {
  assert.throws(() => parseCsv('question,answer\\n"unfinished,answer'), /unterminated/);
  assert.throws(() => parseCsv('question,question\\nx,y'), /duplicate/);
});
