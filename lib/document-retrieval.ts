import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { searchProcurementKnowledge as searchLocalDocs } from '@/lib/procurement-docs';

export interface RetrievedChunk {
  id?: string | number;
  document_name: string;
  document_type: string;
  chunk_text: string;
  metadata?: Record<string, unknown>;
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


function metadataField(metadata: Record<string, unknown> | undefined, keys: string[]): string {
  if (!metadata) return '';
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return '';
}

function sourceIdentity(documentName: string, documentType: string, metadata?: Record<string, unknown>): string {
  const metadataIdentity = [
    'source_file', 'original_file', 'source_title', 'document_title',
    'source_authority', 'authority', 'document_status',
  ].map((key) => metadataField(metadata, [key])).filter(Boolean).join(' ');
  return [documentName, documentType, metadataIdentity].join(' ').toLowerCase();
}

function asksAboutLegacyRules(query: string): boolean {
  return /\bra\s*\.?\s*9184\b|\b9184\b|2016\s*(revised\s*)?irr|transition|transitory|transitional|legacy|previous law|old procurement/i.test(query);
}

function isLegacyProcurementSource(identity: string): boolean {
  // Current RA 12009 material can mention RA 9184 as the law it revises.
  if (/\bra\s*\.?\s*12009\b|new government procurement act|implementing rules and regulations.{0,40}12009/i.test(identity)) {
    return false;
  }
  return /\bra\s*\.?\s*9184\b|local government units procurement manual|2016.{0,20}irr|legacy_ra_9184_reference|historical_reference_not_current/i.test(identity);
}

function isCurrentProcurementLawSource(identity: string): boolean {
  return /\bra\s*\.?\s*12009\b|new government procurement act|implementing rules and regulations.{0,40}12009|\bgppb\b.{0,45}20(25|26)|\b(?:resolution|circular)\b.{0,45}20(25|26)/i.test(identity);
}

function isPMOProcedureSource(identity: string): boolean {
  return /pmo administrative manual|msu.{0,40}(?:procurement|pmo)|procurement management office|pmo operations manual/i.test(identity);
}

/**
 * Fast verified knowledge retrieval using keyword match and local manual cache,
 * ensuring sub-50ms latency without blocking on heavy ML transformer downloads.
 */
export async function retrieveDocumentChunks(query: string, limit: number = 6): Promise<RetrievalResult> {
  const supabase = getSupabase();
  type RankedChunk = RetrievedChunk & { score: number };
  const candidates = new Map<string, RankedChunk>();

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

  // Preserve useful terms from multi-question messages instead of letting the
  // first clause dominate retrieval. Split on sentence boundaries and common
  // follow-up connectors, then search a bounded set of distinct terms.
  const queryParts = normalizedQuery
    // Split compound prompts into separate retrieval intents, including comma-
    // separated instructions such as "explain X, list Y, and tell me Z".
    .split(/[?;.!\n]+|,\s*(?=(?:and\s+)?(?:explain|define|describe|list|tell|identify|name|who|what|why|how|when|where)\b)|\b(?:and also|also|plus|what about|additionally)\b/i)
    .map(part => part.trim())
    .filter(Boolean);
  const terms = Array.from(new Set(
    [...queryParts, normalizedQuery]
      .flatMap(part => part
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length >= 3 && !stopWords.has(t)))
  )).slice(0, 24);

  // Search both the exact phrase and several meaningful terms. The old
  // implementation searched only one "target term", which could retrieve a
  // generic procurement passage even for a very specific institutional question.
  if (supabase && terms.length) {
    try {
      const searches: any[] = [];
      const selectedColumns = 'id, document_name, document_type, chunk_text, metadata';
      const scopedPhraseSearch = (documentName: string, contentPhrase: string) =>
        supabase
          .from('document_chunks')
          .select(selectedColumns)
          .eq('document_name', documentName)
          .ilike('chunk_text', `%${contentPhrase}%`)
          .limit(4);

      // Broad per-word searches can miss the relevant chunk because each term
      // query returns only its first few matches. Add source-scoped searches for
      // known high-risk question types so the authoritative section enters the
      // candidate set before ranking.
      const asksSvpDetails = /\b(small value procurement|svp)\b/i.test(query);
      const asksPurchaseRequestWorkflow =
        /\b(?:purchase requests?|pr)\b/i.test(query) &&
        /\b(sequence|workflow|process|steps|review|reviewing|approval|approving|offices|procedure)\b/i.test(query) &&
        /\b(msu|gensan|university|pmo|procurement)\b/i.test(query);

      if (asksSvpDetails) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        searches.push(
          scopedPhraseSearch(currentIrr, 'Section 34. Small Value Procurement'),
          scopedPhraseSearch(currentIrr, 'shall not require posting'),
          scopedPhraseSearch(currentIrr, 'The BAC shall prepare and send the RFQs or RFPs'),
          scopedPhraseSearch(currentIrr, 'Abstract of Quotations or Ratings'),
          scopedPhraseSearch(currentIrr, 'in case no price quotation is received')
        );
      }

      if (asksPurchaseRequestWorkflow) {
        const pmoManual = 'PMO Administrative Manual';
        searches.push(
          scopedPhraseSearch(pmoManual, '1. Receipt of Purchase Request'),
          scopedPhraseSearch(pmoManual, '3. Validation by the PMO Director'),
          scopedPhraseSearch(pmoManual, 'Endorsement to Budget Management Office'),
          scopedPhraseSearch(pmoManual, 'approved Purchase Requests signed by the Chancellor or authorized approving authority')
        );
      }

      const phrase = normalizedQuery.replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
      const phrases = Array.from(new Set(
        [phrase, ...queryParts.map(part => part.replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim())]
          .filter(part => part.length >= 8)
      )).slice(0, 4);
      for (const searchPhrase of phrases) {
        searches.push(
          supabase
            .from('document_chunks')
            .select('id, document_name, document_type, chunk_text, metadata')
            .ilike('chunk_text', `%${searchPhrase}%`)
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

          const metadata =
            doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)
              ? (doc.metadata as Record<string, unknown>)
              : undefined;
          const identity = sourceIdentity(
            String(doc.document_name || ''),
            String(doc.document_type || ''),
            metadata
          );
          const isLegacy = isLegacyProcurementSource(identity);
          // Historical RA 9184 material should not outrank current rules unless
          // the user explicitly asks about RA 9184, older guidance, or transition.
          if (isLegacy && !asksAboutLegacyRules(query)) continue;

          const haystack = `${doc.document_name || ''} ${text}`.toLowerCase();
          let score = 0;

          for (const searchPhrase of phrases) {
            if (haystack.includes(searchPhrase)) score += searchPhrase === phrase ? 12 : 8;
          }
          let matchedTerms = 0;
          for (const term of terms) {
            const occurrences = haystack.split(term).length - 1;
            if (occurrences > 0) {
              matchedTerms += 1;
              score += Math.min(occurrences, 3) * 2;
            }
          }
          // Prefer chunks that cover more of the user's distinct concepts,
          // especially when a message contains multiple separate questions.
          score += Math.round((matchedTerms / Math.max(terms.length, 1)) * 12);

          // Institutional directory/office questions should strongly prefer
          // chunks that contain both the office and a person's role/name.
          const asksPerson = /\b(director|head|officer|who|person|in[- ]charge|contact)\b/i.test(query);
          const asksProcurement = /\b(procurement|pmo|pro)\b/i.test(query);
          if (asksPerson && asksProcurement && /\b(director|head|nelson|benares)\b/i.test(haystack)) {
            score += 15;
          }

          const asksLegal = /\b(ra\s*\.?\s*12009|ra\s*\.?\s*9184|law|legal|regulation|irr|threshold|svp|small value|competitive bidding|bidding|procurement mode|section|article|deadline|posting|quotation|eligibility|award|supplier)\b/i.test(query);
          const asksInstitutional = /\b(msu|gensan|university|pmo|pro|procurement office|department|chancellor|budget office|purchase request|pr|workflow|process|approval|logbook|director|contact|office)\b/i.test(query);
          if (asksLegal && isCurrentProcurementLawSource(identity)) score += 24;
          if (asksInstitutional && isPMOProcedureSource(identity)) score += 18;
          if (asksSvpDetails && /section 34|small value procurement|shall not require posting|at least three \(3\) suppliers|abstract of quotations or ratings/i.test(text)) score += 35;
          if (asksPurchaseRequestWorkflow && /receipt of purchase request|validation by the pmo director|budget management office|approved prs signed by the chancellor/i.test(text)) score += 40;
          if (/generic government procurement manual|government procurement manual volume|good procurement manual/i.test(identity)) score -= 8;
          if (isLegacy && asksAboutLegacyRules(query)) score += 2;

          const key = String(doc.id || text.slice(0, 120));
          const existing = candidates.get(key);
          const item = {
            id: doc.id,
            document_name: doc.document_name || 'Procurement Records',
            document_type: doc.document_type || 'document_chunks',
            chunk_text: text,
            metadata,
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
        document_name: 'Local reference excerpts (source labels included below)',
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
      const section = metadataField(chunk.metadata, ['section', 'section_number', 'section_title', 'article', 'article_title', 'heading']);
      const page = metadataField(chunk.metadata, ['pdf_page', 'page_number', 'page', 'page_no', 'page_num', 'source_page', 'page_start']);
      const location = [
        section ? `section/article: ${section}` : '',
        page ? `PDF page: ${page}` : '',
      ].filter(Boolean).join(' | ');
      const docHeader = `[DOCUMENT EXCERPT ${index + 1}: ${chunk.document_name.toUpperCase()} (${chunk.document_type})${location ? ` | ${location}` : ''}]`;
      return `${docHeader}\n${chunk.chunk_text}`;
    })
    .join('\n\n========================================\n\n');

  return { formattedContext, chunks, sources };
}
