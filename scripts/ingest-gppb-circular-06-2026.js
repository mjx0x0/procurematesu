const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const SOURCE_URL = 'https://www.gppb.gov.ph/wp-content/uploads/2026/06/Approved_GPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf';
const SOURCE_TITLE = 'GPPB Circular No. 06-2026 (Annex A to Resolution No. 10-2026)';
const DOCUMENT_NAME = 'GPPB Circular No. 06-2026';
const DOCUMENT_TYPE = 'gppb_circular';
const SOURCE_FILE = path.join(process.cwd(), 'data', 'gppb_circular_06_2026.txt');
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EXPECTED_DIMENSIONS = 384;
const MAX_CHUNK_CHARS = 1200;
const APPLY = process.argv.includes('--apply');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim() || value.includes('placeholder')) {
    throw new Error('Missing or invalid ' + name + '. Check your local .env.local file.');
  }
  return value;
}

// Stable UUIDs make repeated or interrupted --apply runs idempotent.
function stableUuid(value) {
  const bytes = crypto.createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function makeChunks(rawText) {
  const paragraphs = rawText.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    // Split a long paragraph deterministically rather than dropping any content.
    if (paragraph.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let offset = 0; offset < paragraph.length; offset += MAX_CHUNK_CHARS) {
        chunks.push(paragraph.slice(offset, offset + MAX_CHUNK_CHARS));
      }
      continue;
    }

    const candidate = current ? current + '\n\n' + paragraph : paragraph;
    if (candidate.length > MAX_CHUNK_CHARS && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error('Source text not found: data/gppb_circular_06_2026.txt');
  }

  const rawText = fs.readFileSync(SOURCE_FILE, 'utf8').trim();
  if (!rawText.includes(SOURCE_URL) || !rawText.includes('Section 4.7')) {
    throw new Error('The source text is missing its official URL or the Section 4.7 SVP documentary matrix reference.');
  }

  const chunks = makeChunks(rawText);
  if (!chunks.length) throw new Error('No non-empty source chunks were created.');

  const prepared = chunks.map((chunk, index) => ({
    id: stableUuid(SOURCE_URL + ':' + index + ':' + chunk),
    document_name: DOCUMENT_NAME,
    document_type: DOCUMENT_TYPE,
    chunk_text: chunk,
    metadata: {
      source_url: SOURCE_URL,
      source_title: SOURCE_TITLE,
      source_file: 'data/gppb_circular_06_2026.txt',
      source_authority: 'gppb_current_issuance',
      document_status: 'current_supplementary_issuance_ra_12009',
      publication_date: '2026-06-19',
      approval_date: '2026-02-03',
      chunk_index: index,
      embedding_model: EMBEDDING_MODEL,
      embedding_dimensions: EXPECTED_DIMENSIONS,
    },
  }));

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, serviceRoleKey);

  const { data: existingRows, error: existingError } = await supabase
    .from('document_chunks')
    .select('id, metadata')
    .eq('document_name', DOCUMENT_NAME)
    .limit(1000);

  if (existingError) throw existingError;

  const matchingRows = (existingRows || []).filter((row) => row.metadata && row.metadata.source_url === SOURCE_URL);
  const conflictingRows = (existingRows || []).filter((row) => !row.metadata || row.metadata.source_url !== SOURCE_URL);
  if (conflictingRows.length) {
    throw new Error(
      'Found existing rows named "' + DOCUMENT_NAME + '" with different or missing source_url metadata. No changes made; review those rows before ingesting to avoid mixing sources.'
    );
  }

  const expectedIds = new Set(prepared.map((row) => row.id));
  const unexpectedExistingIds = matchingRows.filter((row) => !expectedIds.has(row.id));
  if (unexpectedExistingIds.length) {
    throw new Error(
      'Found ' + unexpectedExistingIds.length + ' row(s) for this official source with unexpected IDs. No changes made; inspect them before ingesting to avoid duplicate chunks.'
    );
  }

  console.log('ProcureMateSU — official GPPB Circular 06-2026 ingestion');
  console.log('Source: ' + SOURCE_URL);
  console.log('Mode: ' + (APPLY ? 'APPLY (upsert deterministic IDs)' : 'DRY RUN (no database writes)'));
  console.log('Prepared text chunks: ' + prepared.length);
  console.log('Existing matching chunks: ' + matchingRows.length);
  console.log('Chunks to create or refresh: ' + prepared.length);

  if (!APPLY) {
    console.log('\nDry run complete. Review the source and counts, then add --apply to generate embeddings and upsert the chunks.');
    return;
  }

  console.log('\nLoading ' + EMBEDDING_MODEL + ' to generate ' + EXPECTED_DIMENSIONS + '-dimensional embeddings...');
  const { pipeline } = await import('@xenova/transformers');
  const embedder = await pipeline('feature-extraction', EMBEDDING_MODEL);

  const rows = [];
  for (let index = 0; index < prepared.length; index += 1) {
    const row = prepared[index];
    const output = await embedder(row.chunk_text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);

    if (embedding.length !== EXPECTED_DIMENSIONS || !embedding.every(Number.isFinite)) {
      throw new Error('Invalid embedding for chunk ' + index + ': expected ' + EXPECTED_DIMENSIONS + ' finite values.');
    }

    rows.push({ ...row, embedding });
    console.log('Embedded chunk ' + (index + 1) + '/' + prepared.length);
  }

  // Upsert by deterministic primary key so rerunning this script does not create duplicates.
  const { error: upsertError } = await supabase
    .from('document_chunks')
    .upsert(rows, { onConflict: 'id' });

  if (upsertError) throw upsertError;

  const { count: totalCount, error: countError } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('document_name', DOCUMENT_NAME)
    .contains('metadata', { source_url: SOURCE_URL });

  if (countError) throw countError;

  const { count: missingCount, error: missingError } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('document_name', DOCUMENT_NAME)
    .contains('metadata', { source_url: SOURCE_URL })
    .is('embedding', null);

  if (missingError) throw missingError;
  if ((totalCount || 0) !== prepared.length || (missingCount || 0) !== 0) {
    throw new Error(
      'Post-ingestion verification failed: expected ' + prepared.length + ' chunks and 0 missing embeddings; found ' +
      (totalCount || 0) + ' chunks and ' + (missingCount || 0) + ' missing embeddings.'
    );
  }

  console.log('\nVerification passed: ' + totalCount + ' official-source chunks; 0 missing embeddings.');
  console.log('These chunks are supplementary guidance only. Section 34 of the RA No. 12009 IRR remains the primary source for the SVP procedure.');
}

main().catch((error) => {
  console.error('GPPB Circular ingestion stopped:', error?.message || error);
  process.exitCode = 1;
});
