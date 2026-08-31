const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ✅ Fixed pdf-parse import for v1.x
const pdfParse = require('pdf-parse');

// Supabase client (use service role key for bypassing RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Embedding model – we'll use Transformers.js
let embedder = null;
async function getEmbedder() {
  if (!embedder) {
    console.log('Loading embedding model (first time may take a few minutes)...');
    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Model loaded!');
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
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (err) {
    console.error('PDF parsing error:', err);
    return '';
  }
}

// Ingest a single document
async function ingestDocument(filePath, docType, docName) {
  try {
    console.log(`Processing ${docName}...`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ File not found: ${filePath}. Skipping.`);
      return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const text = await pdfToText(fileBuffer);

    if (!text || text.trim().length === 0) {
      console.log(`  ⚠️ No text extracted from ${docName}. Skipping.`);
      return;
    }

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
        console.error(`  ❌ Error inserting chunk ${i + 1}:`, error.message);
      } else {
        console.log(`  ✅ Inserted chunk ${i + 1}/${chunks.length}`);
      }
    }
    console.log(`✅ Finished ${docName}\n`);
  } catch (err) {
    console.error(`❌ Error processing ${docName}:`, err.message);
  }
}

// ===== RUN =====
(async () => {
  try {
    console.log('🔍 Checking vector dimension...');

    // Check if we need to alter the table
    // Note: We need to make sure the embedding column is vector(384)
    // If you haven't changed it, run this SQL in Supabase once:
    //   ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(384);
    // But we'll try to insert and catch the error.

    const dataDir = path.join(__dirname, '../data');
    console.log(`📂 Looking for files in: ${dataDir}`);

    // Create data folder if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data folder at ${dataDir}`);
      console.log('⚠️ Please place your PDF files in the data/ folder.');
      console.log('   - ra12009.pdf');
      console.log('   - irr.pdf');
      console.log('   - procurement_manual.pdf');
      return;
    }

    const files = [
      { name: 'RA 12009', file: 'ra12009.pdf', type: 'ra_12009' },
      { name: 'IRR', file: 'irr.pdf', type: 'irr' },
      { name: 'Procurement Manual', file: 'procurement_manual.pdf', type: 'procurement_manual' },
    ];

    for (const f of files) {
      const filePath = path.join(dataDir, f.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}. Skipping.`);
        console.log(`   Download from: Official Gazette or GPPB website.`);
        continue;
      }
      await ingestDocument(filePath, f.type, f.name);
    }

    console.log('🎉 All documents processed!');
    console.log('Check your Supabase document_chunks table for the inserted data.');

    // Verify the count
    const { count, error } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`📊 Total chunks in database: ${count}`);
    }

  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();