const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let embedder = null;
async function getEmbedder() {
  if (!embedder) {
    console.log('⏳ Loading embedding model (first time takes ~2 min)...');
    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Model loaded!');
  }
  return embedder;
}

// ✅ Larger chunks for complete context
function chunkText(text, chunkSize = 2000, overlap = 400) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

async function ingestDocument(filePath, docType, docName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}. Skipping.`);
      return;
    }

    console.log(`📄 Processing ${docName}...`);
    const text = fs.readFileSync(filePath, 'utf-8');

    if (!text || text.trim().length === 0) {
      console.log(`  ⚠️ No text content. Skipping.`);
      return;
    }

    const chunks = chunkText(text);
    console.log(`  → ${chunks.length} chunks`);

    const embedder = await getEmbedder();

    const { data: existingRows, error: lookupError } = await supabase
      .from('document_chunks')
      .select('id, chunk_text, metadata')
      .eq('document_name', docName)
      .eq('document_type', docType);

    if (lookupError) throw new Error('Could not check existing chunks: ' + lookupError.message);

    const existingByIndex = new Map();
    for (const row of existingRows || []) {
      const index = Number(row?.metadata?.chunk_index);
      if (Number.isInteger(index) && index >= 0) {
        if (!existingByIndex.has(index)) existingByIndex.set(index, []);
        existingByIndex.get(index).push(row);
      }
    }

    const sourceFile = path.relative(path.join(__dirname, '..'), filePath).split(path.sep).join('/');
    const embedder = await getEmbedder();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const rowsAtIndex = existingByIndex.get(i) || [];
      const matchingRow = rowsAtIndex.find(row => row.chunk_text === chunk);
      const metadata = {
        ...(matchingRow?.metadata || rowsAtIndex[0]?.metadata || {}),
        chunk_index: i,
        source_file: sourceFile,
        source_title: docName,
      };

      if (matchingRow) {
        if (JSON.stringify(matchingRow.metadata || {}) !== JSON.stringify(metadata)) {
          const { error } = await supabase.from('document_chunks').update({ metadata }).eq('id', matchingRow.id);
          if (error) console.error('  ❌ Metadata update failed for chunk ' + (i + 1) + ':', error.message);
        }
        console.log('  ↪ Chunk ' + (i + 1) + '/' + chunks.length + ' already exists; skipped.');
        continue;
      }

      const embedding = await embedder(chunk, { pooling: 'mean', normalize: true });
      const embeddingArray = Array.from(embedding.data);
      const targetRow = rowsAtIndex[0];

      if (targetRow) {
        const { error } = await supabase.from('document_chunks')
          .update({ chunk_text: chunk, embedding: embeddingArray, metadata }).eq('id', targetRow.id);
        if (error) console.error('  ❌ Error updating chunk ' + (i + 1) + ':', error.message);
        else console.log('  ✅ Updated chunk ' + (i + 1) + '/' + chunks.length);
      } else {
        const { error } = await supabase.from('document_chunks').insert({
          document_name: docName, document_type: docType, chunk_text: chunk, embedding: embeddingArray, metadata,
        });
        if (error) console.error('  ❌ Error inserting chunk ' + (i + 1) + ':', error.message);
        else console.log('  ✅ Inserted chunk ' + (i + 1) + '/' + chunks.length);
      }
    }
    console.log(`✅ Finished ${docName}\n`);
  } catch (err) {
    console.error(`❌ Error processing ${docName}:`, err.message);
  }
}

(async () => {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created ${dataDir}. Place your .txt files there.`);
      console.log('Expected files: ra12009.txt (legacy Local Government Units Procurement Manual, 2014), new_ra12009.txt, ra9184.txt, irr2016.txt, irr.txt, gpmvol1.txt, gpmvol2.txt, gpmvol3.txt, gpmvol4.txt, procurement_manual.txt');
      return;
    }

  const files = [
    { name: 'Local Government Units Procurement Manual (2014)', file: 'ra12009.txt', type: 'legacy_lgu_procurement_manual' },
    { name: 'RA 12009 (New)', file: 'new_ra12009.txt', type: 'ra_12009' },
    { name: 'RA 9184', file: 'ra9184.txt', type: 'ra_9184' },
    { name: 'IRR 2016', file: 'irr2016.txt', type: 'irr' },
    { name: 'IRR', file: 'irr.txt', type: 'irr' },
    { name: 'GPM Vol 1', file: 'gpmvol1.txt', type: 'gpm' },
    { name: 'GPM Vol 2', file: 'gpmvol2.txt', type: 'gpm' },
    { name: 'GPM Vol 3', file: 'gpmvol3.txt', type: 'gpm' },
    { name: 'GPM Vol 4', file: 'gpmvol4.txt', type: 'gpm' },
    { name: 'MSU Procurement Manual', file: 'procurement_manual.txt', type: 'procurement_manual' },
  ];

    for (const f of files) {
      const filePath = path.join(dataDir, f.file);
      await ingestDocument(filePath, f.type, f.name);
    }

    const { count, error } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`📊 Total chunks in database: ${count}`);
    }

    console.log('🎉 Done!');
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();