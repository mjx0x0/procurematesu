const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const { pipeline } = require('@xenova/transformers');
require('dotenv').config({ path: '.env.local' });

// Supabase client (use service role key for bypassing RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load embedding model (runs locally using Transformers.js)
let embedder = null;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

// Chunk text into overlapping segments
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

// Convert PDF buffer to text
async function pdfToText(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  return data.text;
}

// Ingest a single document
async function ingestDocument(filePath, docType, docName) {
  console.log(`Processing ${docName}...`);
  const fileBuffer = fs.readFileSync(filePath);
  const text = await pdfToText(fileBuffer);
  const chunks = chunkText(text);
  console.log(`  → ${chunks.length} chunks`);

  const embedder = await getEmbedder();
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Generate embedding (returns a 384-dim vector)
    const embedding = await embedder(chunk, { pooling: 'mean', normalize: true });
    const embeddingArray = Array.from(embedding.data);

    // Insert into Supabase
    const { error } = await supabase
      .from('document_chunks')
      .insert({
        document_name: docName,
        document_type: docType,
        chunk_text: chunk,
        embedding: embeddingArray,
        metadata: { chunk_index: i }
      });

    if (error) {
      console.error(`  ❌ Error inserting chunk ${i}:`, error);
    } else {
      console.log(`  ✅ Inserted chunk ${i + 1}/${chunks.length}`);
    }
  }
  console.log(`✅ Finished ${docName}\n`);
}

// ===== RUN =====
(async () => {
  try {
    // Make sure the vector column is 384-dim (since MiniLM outputs 384)
    // If you haven't changed it, run this SQL once:
    //   ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(384);
    // Then run this script.

    const dataDir = path.join(__dirname, '../data');
    const files = [
      { name: 'RA 12009', file: 'ra12009.pdf', type: 'ra_12009' },
      { name: 'IRR', file: 'irr.pdf', type: 'irr' },
      { name: 'Procurement Manual', file: 'procurement_manual.pdf', type: 'procurement_manual' },
    ];

    for (const f of files) {
      const filePath = path.join(dataDir, f.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}. Skipping.`);
        continue;
      }
      await ingestDocument(filePath, f.type, f.name);
    }
    console.log('🎉 All documents ingested!');
  } catch (err) {
    console.error('Error:', err);
  }
})();