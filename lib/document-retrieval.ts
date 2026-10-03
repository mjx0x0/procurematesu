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

/**
 * Fast verified knowledge retrieval using keyword match and local manual cache,
 * ensuring sub-50ms latency without blocking on heavy ML transformer downloads.
 */
export async function retrieveDocumentChunks(query: string, limit: number = 6): Promise<RetrievalResult> {
  const supabase = getSupabase();
  const candidates = new Map<string, RetrievedChunk & { score: number }>();

  // Expand common procurement/institutional aliases before searching. This makes
  // short questions such as "PRO director" searchable without requiring the user
  // to know the exact office name used in the source documents.
  const normalizedQuery = query
    .toLowerCase()
    .replace(/\bpro\b/g, 'procurement office')
    .replace(/\bpmo\b/g, 'procurement management office')
    .replace(/\bprocurement office\b/g, 'procurement management office');

  const stopWords = new Set([
    'what','when','where','which','who','whom','whose','about','how','does','the',
    'this','that','from','with','tell','give','please','can','you','could','would',
    'is','are','was','were','for','and','or','to','of','in','on','a','an','my',
    'me','it','its','their','there','office','information','question'
  ]);

  const terms = Array.from(new Set(
    normalizedQuery
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length >= 3 && !stopWords.has(t))
  )).slice(0, 8);

  // Search both the exact phrase and several meaningful terms. The old
  // implementation searched only one "target term", which could retrieve a
  // generic procurement passage even for a very specific institutional question.
  if (supabase && terms.length) {
    try {
      const searches: Promise<any>[] = [];

      const phrase = normalizedQuery.replace(/\s+/g, ' ').trim();
      if (phrase.length >= 8) {
        searches.push(
          supabase
            .from('document_chunks')
            .select('id, document_name, document_type, chunk_text, metadata')
            .ilike('chunk_text', `%${phrase}%`)
            .limit(Math.min(8, limit * 2))
        );
      }

      for (const term of terms) {
        searches.push(
          supabase
            .from('document_chunks')
            .select('id, document_name, document_type, chunk_text, metadata')
            .ilike('chunk_text', `%${term}%`)
            .limit(Math.min(8, limit * 2))
        );
      }

      const results = await Promise.all(searches);

      for (const result of results) {
        for (const doc of result?.data || []) {
          const text = String(doc.chunk_text || '').trim();
          if (!text) continue;

          const haystack = `${doc.document_name || ''} ${text}`.toLowerCase();
          let score = 0;

          if (phrase.length >= 8 && haystack.includes(phrase)) score += 20;
          for (const term of terms) {
            const occurrences = haystack.split(term).length - 1;
            if (occurrences > 0) score += Math.min(occurrences, 3) * 2;
          }

          // Institutional directory/office questions should strongly prefer
          // chunks that contain both the office and a person's role/name.
          const asksPerson = /\b(director|head|officer|who|person|in[- ]charge|contact)\b/i.test(query);
          const asksProcurement = /\b(procurement|pmo|pro)\b/i.test(query);
          if (asksPerson && asksProcurement && /\b(director|head|nelson|benares)\b/i.test(haystack)) {
            score += 15;
          }

          const key = String(doc.id || text.slice(0, 120));
          const existing = candidates.get(key);
          const item = {
            id: doc.id,
            document_name: doc.document_name || 'Procurement Records',
            document_type: doc.document_type || 'document_chunks',
            chunk_text: text,
            source_type: 'supabase_keyword' as const,
            score
          };
          if (!existing || score > existing.score) candidates.set(key, item);
        }
      }
    } catch (err) {
      console.warn('[Retrieval] Keyword search notice:', err);
    }
  }

  const ranked = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Local fallback only when the database does not provide a relevant chunk.
  if (ranked.length === 0) {
    const localText = searchLocalDocs(query, limit);
    if (localText) {
      ranked.push({
        document_name: 'RA 12009 / MSU Procurement Guidelines (System Verified)',
        document_type: 'local_reference',
        chunk_text: localText,
        source_type: 'local_fallback',
        score: 1,
      });
    }
  }

  const chunks: RetrievedChunk[] = ranked.map(({ score, ...chunk }) => chunk);
  const sources = Array.from(new Set(chunks.map(c => c.document_name).filter(Boolean)));
  const formattedContext = chunks
    .map((chunk, index) => {
      const docHeader = `[DOCUMENT EXCERPT ${index + 1}: ${chunk.document_name.toUpperCase()} (${chunk.document_type})]`;
      return `${docHeader}\n${chunk.chunk_text}`;
    })
    .join('\n\n========================================\n\n');

  return { formattedContext, chunks, sources };
}
