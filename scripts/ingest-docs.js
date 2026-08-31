const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ✅ Correct import for pdf-parse (v1.x)
const pdfParse = require('pdf-parse');

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Embedding model – Transformers.js
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

// Chunk text
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

// Try PDF, fallback to .txt
async function extractText(filePath) {
  // If .txt version exists, use it
  const txtPath = filePath.replace(/\.pdf$/i, '.txt');
  if (fs.existsSync(txtPath)) {
    console.log(`  📄 Using text file: ${path.basename(txtPath)}`);
    return fs.readFileSync(txtPath, 'utf-8');
  }

  // Otherwise parse PDF
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    console.error(`  ❌ PDF parsing failed: ${err.message}`);
    return null;
  }
}

// Ingest a single document
async function ingestDocument(filePath, docType, docName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}. Skipping.`);
      return;
    }

    console.log(`📄 Processing ${docName}...`);
    const text = await extractText(filePath);

    if (!text || text.trim().length === 0) {
      console.log(`  ⚠️ No text extracted. Skipping.`);
      return;
    }

    const chunks = chunkText(text);
    console.log(`  → ${chunks.length} chunks`);

    const embedder = await getEmbedder();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedder(chunk, { pooling: 'mean', normalize: true });
      const embeddingArray = Array.from(embedding.data);

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
        console.error(`  ❌ Error chunk ${i+1}:`, error.message);
      } else {
        console.log(`  ✅ Chunk ${i+1}/${chunks.length}`);
      }
    }
    console.log(`✅ Finished ${docName}\n`);
  } catch (err) {
    console.error(`❌ Error processing ${docName}:`, err.message);
  }
}

// ===== MAIN =====
(async () => {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created ${dataDir}. Place your PDF or TXT files there.`);
      return;
    }

    const files = [
      { name: 'RA 12009', file: 'ra12009.pdf', type: 'ra_12009' },
      { name: 'IRR', file: 'irr.pdf', type: 'irr' },
      { name: 'Procurement Manual', file: 'procurement_manual.pdf', type: 'procurement_manual' },
    ];

    for (const f of files) {
      const filePath = path.join(dataDir, f.file);
      await ingestDocument(filePath, f.type, f.name);
    }

    // Verify count
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