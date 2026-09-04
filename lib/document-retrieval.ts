import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { searchProcurementKnowledge as searchLocalDocs } from '@/lib/procurement-docs';

export interface RetrievedChunk {
  id?: string | number;
  document_name: string;
  document_type: string;
  chunk_text: string;
  similarity?: number;
  source_type: 'supabase_vector' | 'supabase_keyword' | 'local_fallback';
}

export interface RetrievalResult {
  formattedContext: string;
  chunks: RetrievedChunk[];
  sources: string[];
}

let supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && url.startsWith('http') && !url.includes('placeholder')) {
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

let embedderInstance: any = null;
let isModelLoading = false;

async function getEmbedder(): Promise<any> {
  if (embedderInstance) return embedderInstance;
  if (isModelLoading) {
    // Wait briefly if already loading
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (embedderInstance) return embedderInstance;
    }
  }

  isModelLoading = true;
  try {
    const { pipeline } = await import('@xenova/transformers');
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return embedderInstance;
  } catch (err) {
    console.warn('[Embedder] Failed to load Xenova transformer:', err);
    return null;
  } finally {
    isModelLoading = false;
  }
}

/**
 * Retrieve verified knowledge chunks from the `document_chunks` table in Supabase.
 * Uses hybrid approach: vector similarity search (via match_documents RPC) + keyword matching.
 */
export async function retrieveDocumentChunks(
  query: string,
  limit: number = 4
): Promise<RetrievalResult> {
  const supabase = getSupabase();
  const collectedChunks: RetrievedChunk[] = [];
  const seenTexts = new Set<string>();

  if (supabase) {
    // 1. Semantic Vector Search via match_documents RPC
    try {
      const embedder = await getEmbedder();
      if (embedder) {
        // Embed query with 3s timeout
        const embeddingPromise = embedder(query, { pooling: 'mean', normalize: true });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Embedding timeout')), 3500)
        );

        const embeddingOutput = await Promise.race([embeddingPromise, timeoutPromise]);
        const embeddingArray = Array.from(embeddingOutput.data);

        const { data: matches, error: rpcError } = await supabase.rpc('match_documents', {
          query_embedding: embeddingArray,
          match_threshold: 0.15,
          match_count: limit + 2,
        });

        if (!rpcError && Array.isArray(matches) && matches.length > 0) {
          const ids = matches.map(m => m.id);
          const { data: enrichedDocs } = await supabase
            .from('document_chunks')
            .select('id, document_name, document_type, chunk_text')
            .in('id', ids);

          if (enrichedDocs && enrichedDocs.length > 0) {
            // Map enriched data preserving similarity order
            const docMap = new Map(enrichedDocs.map(d => [d.id, d]));
            for (const match of matches) {
              const doc = docMap.get(match.id);
              if (doc && !seenTexts.has(doc.chunk_text.slice(0, 80))) {
                seenTexts.add(doc.chunk_text.slice(0, 80));
                collectedChunks.push({
                  id: doc.id,
                  document_name: doc.document_name || 'Philippine Procurement Law',
                  document_type: doc.document_type || 'procurement_law',
                  chunk_text: doc.chunk_text.trim(),
                  similarity: match.similarity,
                  source_type: 'supabase_vector',
                });
              }
            }
          }
        }
      }
    } catch (vectorErr: any) {
      console.warn('[Retrieval] Vector search notice:', vectorErr?.message || vectorErr);
    }

    // 2. Keyword Search in document_chunks (for specific terms like "12009", "SVP", "Shopping", "PPMP")
    try {
      const cleanTerms = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 4 && !['what', 'when', 'where', 'which', 'about', 'how', 'the', 'this', 'that', 'from', 'with'].includes(t));

      if (cleanTerms.length > 0 && collectedChunks.length < limit) {
        // Pick the 2 most distinctive terms
        const targetTerm = cleanTerms.find(t => t.includes('12009') || t.includes('9184') || t.includes('bidding') || t.includes('procurement') || t.includes('threshold') || t.includes('canvass')) || cleanTerms[0];

        const { data: keywordDocs } = await supabase
          .from('document_chunks')
          .select('id, document_name, document_type, chunk_text')
          .ilike('chunk_text', `%${targetTerm}%`)
          .limit(3);

        if (keywordDocs && keywordDocs.length > 0) {
          for (const doc of keywordDocs) {
            if (!seenTexts.has(doc.chunk_text.slice(0, 80))) {
              seenTexts.add(doc.chunk_text.slice(0, 80));
              collectedChunks.push({
                id: doc.id,
                document_name: doc.document_name || 'Procurement Records',
                document_type: doc.document_type || 'document_chunks',
                chunk_text: doc.chunk_text.trim(),
                source_type: 'supabase_keyword',
              });
            }
            if (collectedChunks.length >= limit) break;
          }
        }
      }
    } catch (keywordErr) {
      console.warn('[Retrieval] Keyword search notice:', keywordErr);
    }
  }

  // 3. Fallback to Local Knowledge Base if Supabase yielded nothing
  if (collectedChunks.length === 0) {
    const localText = searchLocalDocs(query, limit);
    if (localText) {
      collectedChunks.push({
        document_name: 'RA 12009 / MSU Procurement Guidelines (System Verified)',
        document_type: 'local_reference',
        chunk_text: localText,
        source_type: 'local_fallback',
      });
    }
  }

  // Format distinct sources
  const distinctSources = Array.from(
    new Set(collectedChunks.map(c => c.document_name).filter(Boolean))
  );

  // Build grounded formatted context string
  const formattedContext = collectedChunks
    .map((chunk, index) => {
      const docHeader = `[DOCUMENT EXCERPT ${index + 1}: ${chunk.document_name.toUpperCase()} (${chunk.document_type})]`;
      return `${docHeader}\n${chunk.chunk_text}`;
    })
    .join('\n\n========================================\n\n');

  return {
    formattedContext,
    chunks: collectedChunks,
    sources: distinctSources,
  };
}
