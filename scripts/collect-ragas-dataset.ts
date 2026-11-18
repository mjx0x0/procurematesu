import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { retrieveDocumentChunks } from '../lib/document-retrieval';
loadEnv({ path: '.env.local' });
loadEnv();
type DatasetRow = Record<string, string>;
const { parseCsv, serializeCsv } = require('./lib/ragas-csv.cjs') as {
  parseCsv: (text: string) => unknown[];
  serializeCsv: (rows: DatasetRow[], headers: string[]) => string;
};
const DEFAULT_INPUT = 'evaluation/datasets/gab_ai_ragas_starter_dataset.csv';
const DEFAULT_OUTPUT = 'evaluation/datasets/gab_ai_ragas_collected.csv';
const REQUIRED_COLUMNS = ['user_input', 'response', 'reference', 'reference_contexts'];

function readArgs(argv: string[]) {
  const options: { input: string; output: string; limit?: number; delayMs: number; force: boolean } = {
    input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, delayMs: 150, force: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--input' && next) { options.input = next; index += 1; }
    else if (arg === '--output' && next) { options.output = next; index += 1; }
    else if (arg === '--limit' && next) {
      const parsed = Number(next);
      if (!Number.isInteger(parsed) || parsed < 1) throw new Error('--limit must be a positive integer.');
      options.limit = parsed; index += 1;
    } else if (arg === '--delay-ms' && next) {
      const parsed = Number(next);
      if (!Number.isInteger(parsed) || parsed < 0) throw new Error('--delay-ms must be a non-negative integer.');
      options.delayMs = parsed; index += 1;
    } else if (arg === '--force') options.force = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: bun run scripts/collect-ragas-dataset.ts [--input path] [--output path] [--limit N] [--delay-ms N] [--force]');
      process.exit(0);
    } else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  return options;
}

async function main() {
  const options = readArgs(process.argv.slice(2));
  const inputPath = resolve(options.input);
  const outputPath = resolve(options.output);
  if (!existsSync(inputPath)) {
    throw new Error(`Starter dataset not found: ${inputPath}. Put the provided CSV at ${DEFAULT_INPUT} or pass --input.`);
  }
  if (existsSync(outputPath) && !options.force) {
    throw new Error(`Output already exists: ${outputPath}. Choose another --output path or pass --force.`);
  }

  const rows = parseCsv(readFileSync(inputPath, 'utf8')) as DatasetRow[];
  if (!rows.length) throw new Error('The input CSV contains no dataset rows.');
  const missing = REQUIRED_COLUMNS.filter((column) => !(column in rows[0]));
  if (missing.length) throw new Error(`Starter CSV is missing required columns: ${missing.join(', ')}`);

  const selected = options.limit ? rows.slice(0, options.limit) : rows;
  const headers = Array.from(new Set([...Object.keys(rows[0]), 'retrieved_contexts', 'retrieved_sources', 'retrieval_status', 'retrieval_error']));
  const output: DatasetRow[] = [];
  let withContexts = 0;
  let withoutContexts = 0;

  for (let index = 0; index < selected.length; index += 1) {
    const row = { ...selected[index] };
    const question = row.user_input?.trim();
    if (!question) {
      Object.assign(row, { retrieved_contexts: '[]', retrieved_sources: '[]', retrieval_status: 'skipped_empty_question', retrieval_error: '' });
      output.push(row); withoutContexts += 1; continue;
    }
    try {
      // Same read-only retrieval function used by Gab AI; no database writes.
      const result = await retrieveDocumentChunks(question, 6);
      const contexts = result.chunks.map((chunk) => chunk.chunk_text).filter(Boolean);
      const sources = result.chunks.map((chunk) => ({
        document_name: chunk.document_name,
        document_type: chunk.document_type,
        source_type: chunk.source_type,
        similarity: chunk.similarity ?? null,
        metadata: chunk.metadata ?? {},
      }));
      Object.assign(row, {
        retrieved_contexts: JSON.stringify(contexts),
        retrieved_sources: JSON.stringify(sources),
        retrieval_status: contexts.length
          ? (sources.length > 0 && sources.every((source) => source.source_type === 'local_fallback') ? 'local_fallback_only' : 'collected')
          : 'no_contexts_returned',
        retrieval_error: '',
      });
      if (contexts.length) withContexts += 1;
      else withoutContexts += 1;
    } catch (error) {
      Object.assign(row, {
        retrieved_contexts: '[]', retrieved_sources: '[]', retrieval_status: 'error',
        retrieval_error: error instanceof Error ? error.message : 'Unknown retrieval error',
      });
      withoutContexts += 1;
    }
    output.push(row);
    console.log(`[${index + 1}/${selected.length}] ${row.retrieval_status}: ${question.slice(0, 90)}`);
    if (index < selected.length - 1 && options.delayMs > 0) {
      await new Promise((done) => setTimeout(done, options.delayMs));
    }
  }

  await mkdir(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serializeCsv(output, headers), 'utf8');
  console.log('\nCollection complete.');
  console.log(`Rows processed: ${output.length}`);
  console.log(`Rows with retrieved contexts: ${withContexts}`);
  console.log(`Rows without contexts / errors / skipped: ${withoutContexts}`);
  console.log(`Output: ${outputPath}`);
  console.log('Existing response, reference, and reference_contexts values were preserved; none were generated.');
}

main().catch((error) => {
  console.error(`RAGAS collection failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
