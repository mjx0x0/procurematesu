const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EXPECTED_DIMENSIONS = 384;
const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 6;

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim() || value.includes('placeholder')) {
    throw new Error(`Missing or invalid ${name}. Check your local .env.local file.`);
  }
  return value;
}

function inBatches(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, serviceRoleKey);

  const { count: missingCount, error: countError } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);

  if (countError) throw countError;

  const { data: missingRows, error: missingError } = await supabase
    .from('document_chunks')
    .select('id, document_name, document_type, chunk_text, metadata')
    .is('embedding', null)
    .limit(1000);

  if (missingError) throw missingError;

  const { data: legacyRows, error: legacyError } = await supabase
    .from('document_chunks')
    .select('id, metadata')
    .eq('document_name', 'Local Government Units Procurement Manual (2014)')
    .limit(1000);

  if (legacyError) throw legacyError;

  const rowsToRepair = (legacyRows || []).filter(
    (row) => row.metadata && row.metadata.source_file === 'data/ra12009.txt'
  );

  const missingBySource = (missingRows || []).reduce((counts, row) => {
    const name = row.document_name || '[unnamed document]';
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {});

  console.log('ProcureMateSU knowledge-base repair');
  console.log(`Mode: ${APPLY ? 'APPLY CHANGES' : 'DRY RUN (no database changes)'}`);
  console.log(`Rows missing embeddings: ${missingCount || 0}`);
  console.log(`Legacy-manual provenance records to correct: ${rowsToRepair.length}`);
  console.log('Missing embeddings by source:');
  console.log(JSON.stringify(missingBySource, null, 2));

  if (!APPLY) {
    console.log('\nDry run complete. Review these counts, then run with --apply to make changes.');
    return;
  }

  if ((missingCount || 0) > 1000) {
    throw new Error('More than 1000 rows are missing embeddings; stop and adapt the script to page the results safely.');
  }

  let embedded = 0;
  let embeddingFailures = 0;

  if ((missingRows || []).length > 0) {
    console.log(`Loading ${EMBEDDING_MODEL}; this may take time on the first run.`);
    const { pipeline } = await import('@xenova/transformers');
    const embedder = await pipeline('feature-extraction', EMBEDDING_MODEL);

    for (const batch of inBatches(missingRows, BATCH_SIZE)) {
      const results = await Promise.all(batch.map(async (row) => {
        try {
          if (!row.chunk_text || !row.chunk_text.trim()) {
            throw new Error('Chunk text is empty');
          }

          const output = await embedder(row.chunk_text, { pooling: 'mean', normalize: true });
          const embedding = Array.from(output.data);

          if (embedding.length !== EXPECTED_DIMENSIONS) {
            throw new Error(`Expected ${EXPECTED_DIMENSIONS} dimensions, received ${embedding.length}`);
          }

          const metadata = {
            ...(row.metadata || {}),
            embedding_status: 'embedded',
            embedding_model: EMBEDDING_MODEL,
            embedding_dimensions: EXPECTED_DIMENSIONS,
          };

          const { error } = await supabase
            .from('document_chunks')
            .update({ embedding, metadata })
            .eq('id', row.id)
            .is('embedding', null);

          if (error) throw error;
          return { ok: true, id: row.id };
        } catch (error) {
          console.error(`Embedding failed for row ${row.id} (${row.document_name}):`, error.message || error);
          return { ok: false, id: row.id };
        }
      }));

      embedded += results.filter((result) => result.ok).length;
      embeddingFailures += results.filter((result) => !result.ok).length;
      console.log(`Embedding progress: ${embedded + embeddingFailures}/${missingRows.length}; succeeded ${embedded}; failed ${embeddingFailures}`);
    }
  }

  let provenanceUpdated = 0;
  let provenanceFailures = 0;

  // The ingestion file is named ra12009.txt, but its contents are the 2014
  // Local Government Units Procurement Manual under the RA 9184 framework.
  // Preserve the ingestion path separately from the original source document.
  for (const batch of inBatches(rowsToRepair, BATCH_SIZE)) {
    const results = await Promise.all(batch.map(async (row) => {
      try {
        const { data: latestRow, error: latestError } = await supabase
          .from('document_chunks')
          .select('metadata')
          .eq('id', row.id)
          .single();
        if (latestError) throw latestError;

        const metadata = {
          ...((latestRow?.metadata as Record<string, unknown> | null) || row.metadata || {}),
          source_file: 'LocalGovUnitsProcManual.pdf',
          ingestion_file: 'data/ra12009.txt',
          source_title: 'Local Government Units Procurement Manual (2014)',
          publication_year: 2014,
          source_authority: 'legacy_ra_9184_reference',
          document_status: 'historical_reference_not_current_ra_12009_law',
          authority_note: '2014 LGU-specific procurement manual developed under the RA 9184 framework; not the text of RA 12009 or its current IRR.',
        };

        const { error } = await supabase
          .from('document_chunks')
          .update({ metadata })
          .eq('id', row.id);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error(`Provenance repair failed for row ${row.id}:`, error.message || error);
        return false;
      }
    }));

    provenanceUpdated += results.filter(Boolean).length;
    provenanceFailures += results.filter((success) => !success).length;
  }

  console.log('\nRepair summary');
  console.log(`Embeddings created: ${embedded}`);
  console.log(`Embedding failures: ${embeddingFailures}`);
  console.log(`Legacy source metadata corrected: ${provenanceUpdated}`);
  console.log(`Metadata failures: ${provenanceFailures}`);

  const { count: remainingCount, error: verifyError } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);

  if (verifyError) throw verifyError;
  console.log(`Rows still missing embeddings (verification): ${remainingCount || 0}`);

  if (embeddingFailures > 0 || provenanceFailures > 0 || (remainingCount || 0) > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Knowledge-base repair stopped:', error.message || error);
  process.exitCode = 1;
});
