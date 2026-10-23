import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { searchProcurementKnowledge as searchLocalDocs } from '@/lib/procurement-docs';

type DocumentMetadata = Record<string, unknown>;
type QueryIntent = {
  historical: boolean;
  currentLegal: boolean;
  institutional: boolean;
  svpThreshold: boolean;
  asksContactOrLocation: boolean;
};
type RankedChunk = RetrievedChunk & { score: number };

export interface RetrievedChunk {
  id?: string | number;
  document_name: string;
  document_type: string;
  chunk_text: string;
  metadata?: DocumentMetadata;
  similarity?: number;
  source_type: 'supabase_vector' | 'supabase_keyword' | 'local_fallback';
}
export interface RetrievalResult {
  formattedContext: string;
  chunks: RetrievedChunk[];
  sources: string[];
}

const CURRENT_LEGAL_TYPES = ['irr_ra_12009', 'ra_12009'];
const LEGACY_TYPES = ['ra_9184', 'irr', 'gpm', 'legacy_lgu_procurement_manual'];
const INTERNAL_TYPES = ['pmo_administrative_manual', 'procurement_manual', 'institutional_directory', 'institutional_advisory'];

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

function getIntent(query: string): QueryIntent {
  const historical = /\b(?:ra\s*9184|2016\s+(?:revised\s+)?irr|historical|legacy|old law|previous law|before ra\s*12009|compare|comparison|2014 lgu manual)\b/i.test(query);
  const svpThreshold = /\b(?:svp|small value procurement)\b/i.test(query) &&
    /\b(?:threshold|posting|posted|philgeps|200\s*,?\s*000|abc|amount|below|above|limit|requirement)\b/i.test(query);
  const currentLegal = !historical && /\bra\s*12009\b|\bnew government procurement act\b|\bcurrent law\b|\bimplementing rules\b|\birr\b|\blaw\b|\blegal\b|\bthreshold\b|\bphilgeps\b|\bsmall value procurement\b|\bsvp\b|\babc\b|\bapproved budget\b|\bprocurement mode\b|\bposting requirement\b|\bsection\s+\d+/i.test(query);
  const institutional = /\b(msu|gensan|university|pmo|procurement management office|procurement office|chancellor|budget office|end[- ]user|local procedure|local process|internal procedure|director|contact|office location|workflow)\b/i.test(query);
  const asksContactOrLocation = /\b(director|head|officer|contact|phone|telephone|number|address|location|relocat|where is)\b/i.test(query);
  return { historical, currentLegal, institutional, svpThreshold, asksContactOrLocation };
}

function normalizeQuery(query: string): string {
  return query.toLowerCase()
    .replace(/\bpro\b/g, 'procurement office')
    .replace(/\bpmo\b/g, 'procurement management office')
    .replace(/\bprocurement office\b/g, 'procurement management office');
}

function extractTerms(query: string): string[] {
  const stop = new Set(['what','when','where','which','who','whom','whose','about','how','does','the','this','that','from','with','tell','give','please','can','you','could','would','is','are','was','were','for','and','or','to','of','in','on','a','an','my','me','it','its','their','there','office','information','question','explain','describe','define','list','main','purpose','should']);
  const normalized = normalizeQuery(query);
  const parts = normalized.split(/[?;.!]+|\n+|,\s*(?=(?:and\s+)?(?:explain|define|describe|list|tell|identify|name|who|what|why|how|when|where)\b)|\b(?:and also|also|plus|what about|additionally)\b/i);
  const words = parts.flatMap(part => part.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/))
    .map(term => term.trim()).filter(term => term.length >= 3 && !stop.has(term));
  const amountTerms = (query.match(/\b\d{1,3}(?:,\d{3})+\b/g) || []).flatMap(value => [value, value.replace(/,/g, '')]);
  return Array.from(new Set([...words, ...amountTerms])).slice(0, 16);
}

function getPhrases(query: string): string[] {
  const normalized = normalizeQuery(query);
  const parts = normalized.split(/[?;.!]+|\n+|,\s*(?=(?:and\s+)?(?:explain|define|describe|list|tell|identify|name|who|what|why|how|when|where)\b)|\b(?:and also|also|plus|what about|additionally)\b/i)
    .map(part => part.replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(part => part.length >= 8 && part.length <= 90);
  return Array.from(new Set(parts)).slice(0, 3);
}

function sourcePriority(chunk: RetrievedChunk, intent: QueryIntent): number {
  const type = (chunk.document_type || '').toLowerCase();
  const name = (chunk.document_name || '').toLowerCase();
  const currentIrr = type === 'irr_ra_12009';
  const currentAct = type === 'ra_12009' && !name.includes('local government');
  const legacy = LEGACY_TYPES.includes(type) || name.includes('local government units procurement manual') || name.includes('generic procurement manual') || name.includes('2016');
  const pmoManual = type === 'pmo_administrative_manual';
  const msuManual = pmoManual || type === 'procurement_manual';

  if (intent.historical) {
    if (legacy) return 78;
    if (currentIrr || currentAct) return 68;
    if (msuManual) return 24;
    return 0;
  }
  if (intent.svpThreshold) {
    if (currentIrr) return 130;
    if (currentAct) return 105;
    if (pmoManual) return 76;
    if (type === 'procurement_manual') return 42;
    if (legacy) return -90;
    return 0;
  }
  if (intent.currentLegal) {
    if (currentIrr) return 112;
    if (currentAct) return 98;
    if (pmoManual) return intent.institutional ? 28 : 6;
    if (type === 'procurement_manual') return intent.institutional ? 23 : 0;
    if (legacy) return -90;
    return 0;
  }
  if (intent.institutional) {
    if (type === 'institutional_directory' && intent.asksContactOrLocation) return 100;
    if (type === 'institutional_advisory' && intent.asksContactOrLocation) return 95;
    if (pmoManual) return 84;
    if (type === 'procurement_manual') return 72;
    if (currentIrr || currentAct) return 32;
    if (legacy) return -30;
    return 0;
  }
  if (currentIrr) return 48;
  if (currentAct) return 42;
  if (pmoManual) return 30;
  if (type === 'procurement_manual') return 24;
  if (type === 'institutional_directory' || type === 'institutional_advisory') return 18;
  if (legacy) return -24;
  return 0;
}

function scoreChunk(chunk: RetrievedChunk, query: string, terms: string[], phrases: string[], intent: QueryIntent): number {
  const body = ((chunk.document_name || '') + ' ' + (chunk.chunk_text || '')).toLowerCase();
  const matched = terms.filter(term => body.includes(term.toLowerCase())).length;
  const coverage = matched / Math.max(terms.length, 1);
  let relevance = Math.min(36, matched * 2 + Math.round(coverage * 18));
  for (const phrase of phrases) if (body.includes(phrase.toLowerCase())) relevance += phrase.length > 35 ? 8 : 5;
  const section = String(chunk.metadata?.section || '').toLowerCase();
  if (intent.svpThreshold && /section\s+34|small value procurement|200,000/.test(section + ' ' + body)) relevance += 18;
  const sectionAsked = query.match(/\bsection\s+\d+/i)?.[0]?.toLowerCase() || '';
  if (intent.currentLegal && sectionAsked && section.includes(sectionAsked)) relevance += 18;
  if (intent.asksContactOrLocation && /\b(director|head|contact|telephone|phone|relocat|address)\b/i.test(body)) relevance += 12;
  return sourcePriority(chunk, intent) + Math.min(relevance, 54);
}

function makeSearch(supabase: SupabaseClient, needle: string, types?: string[], resultLimit = 8) {
  let request = supabase.from('document_chunks')
    .select('id, document_name, document_type, chunk_text, metadata')
    .ilike('chunk_text', '%' + needle + '%')
    .limit(resultLimit);
  if (types?.length) request = request.in('document_type', types);
  return request;
}

function addCandidate(map: Map<string, RankedChunk>, raw: any, query: string, terms: string[], phrases: string[], intent: QueryIntent) {
  const text = String(raw?.chunk_text || '').trim();
  if (!text) return;
  const chunk: RetrievedChunk = {
    id: raw.id,
    document_name: raw.document_name || 'Procurement Records',
    document_type: raw.document_type || 'document_chunks',
    chunk_text: text,
    metadata: (raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}) as DocumentMetadata,
    source_type: 'supabase_keyword',
  };
  const key = String(chunk.id || text.slice(0, 120));
  const score = scoreChunk(chunk, query, terms, phrases, intent);
  if (!map.has(key) || score > map.get(key)!.score) map.set(key, { ...chunk, score });
}

function sourceStatusNote(chunk: RetrievedChunk): string {
  const type = (chunk.document_type || '').toLowerCase();
  const name = (chunk.document_name || '').toLowerCase();
  if (type === 'legacy_lgu_procurement_manual' || name.includes('local government units procurement manual')) {
    return '[SOURCE STATUS: 2014 Local Government Units Procurement Manual, developed under the RA 9184 framework. It is a legacy LGU-specific manual, not the text of RA 12009 or its current IRR. Use for historical/LGU context unless the user explicitly asks about that manual.]';
  }
  if (['ra_9184','irr','gpm'].includes(type) || name.includes('generic procurement manual') || name.includes('2016')) {
    return '[SOURCE STATUS: Legacy RA 9184-era reference. Do not present this as the controlling current RA 12009 rule unless the user asks for historical comparison or a transition-specific question.]';
  }
  if (type === 'pmo_administrative_manual' || type === 'procurement_manual') {
    return '[SOURCE STATUS: Internal/local procurement procedure manual, not a statute. It can describe the stated MSU-GenSan process but does not override RA 12009 or its GPPB-approved IRR. The current approval/version of the manual has not been independently verified.]';
  }
  return '';
}

function svpAuthorityNote(): string {
  return [
    '[CURRENT-LAW AUTHORITY CHECK — SMALL VALUE PROCUREMENT POSTING]',
    'Section 34.3(b) of the GPPB-approved IRR of RA 12009 says RFQs/RFPs with an ABC equal to ₱200,000 and below do not require posting. Under this provision, posting is not required at exactly ₱200,000; the posting bracket starts above ₱200,000.',
    'The PMO Administrative Manual in this knowledge base says SVPs with an ABC of ₱200,000 and above should be posted. This conflicts with the IRR at exactly ₱200,000. State these two source statements separately, treat the GPPB-approved IRR as the legal rule, and flag the PMO manual wording for confirmation. Do not silently merge the two rules.',
    'Authoritative IRR approved through GPPB Resolution No. 02-2025: https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No-12009-as-of-11022025.pdf',
    'GPPB Public Advisory No. 09-2026 confirms the “1st Edition, as of 31 March 2026” IRR was withdrawn and directs users to the IRR approved under Resolution No. 02-2025: https://www.gppb.gov.ph/public-advisory-no-09-2026/',
  ].join('\n');
}

function selectResults(map: Map<string, RankedChunk>, limit: number, intent: QueryIntent): RankedChunk[] {
  const ordered = Array.from(map.values()).sort((a, b) => b.score - a.score);
  const selected: RankedChunk[] = [];
  const ids = new Set<string>();
  function add(item?: RankedChunk) {
    if (!item) return;
    const key = String(item.id || item.chunk_text.slice(0, 120));
    if (ids.has(key)) return;
    ids.add(key);
    selected.push(item);
  }

  // Include both the controlling IRR and the local manual when the known
  // threshold conflict is relevant, even if many IRR chunks rank highly.
  if (intent.svpThreshold) {
    add(ordered.find(item => item.document_type === 'irr_ra_12009' && /section\s+34|200,000|small value procurement/i.test(item.chunk_text)));
    add(ordered.find(item => ['pmo_administrative_manual','procurement_manual'].includes(item.document_type) && /200,000|small value procurement|philgeps/i.test(item.chunk_text)));
  }

  const countByDoc = new Map<string, number>();
  for (const item of ordered) {
    if (selected.length >= limit) break;
    const key = String(item.id || item.chunk_text.slice(0, 120));
    if (ids.has(key)) continue;
    const docName = item.document_name;
    if ((countByDoc.get(docName) || 0) >= 3) continue;
    add(item);
    countByDoc.set(docName, (countByDoc.get(docName) || 0) + 1);
  }
  for (const item of ordered) {
    if (selected.length >= limit) break;
    add(item);
  }
  return selected.slice(0, limit);
}

/**
 * Keyword retrieval is source-aware: official RA 12009 sources outrank
 * legacy RA 9184 materials for current-law questions, while local manuals
 * remain available for MSU-specific procedures without overriding the law.
 */
export async function retrieveDocumentChunks(query: string, limit: number = 6): Promise<RetrievalResult> {
  const supabase = getSupabase();
  const intent = getIntent(query);
  const terms = extractTerms(query);
  const phrases = getPhrases(query);
  const candidates = new Map<string, RankedChunk>();

  if (supabase && terms.length) {
    const generalNeedles = Array.from(new Set([...phrases.slice(0, 2), ...terms.slice(0, 9)])).slice(0, 12);
    const requests: Array<{ needle: string; types?: string[]; limit?: number }> = generalNeedles.map(needle => ({ needle, limit: 8 }));

    // Target the official current Act/IRR, instead of relying only on the
    // first generic keyword hits (which previously favored legacy documents).
    if (intent.currentLegal || intent.svpThreshold || /\bra\s*12009\b/i.test(query)) {
      const legalNeedles = Array.from(new Set([
        ...terms.filter(term => /\b(?:12009|threshold|posting|philgeps|small|value|svp|abc|budget|section|34)\b/i.test(term)).slice(0, 5),
        ...(intent.svpThreshold ? ['Section 34', '200,000', 'Small Value Procurement'] : []),
      ])).slice(0, 8);
      for (const needle of legalNeedles) requests.push({ needle, types: CURRENT_LEGAL_TYPES, limit: 12 });
    }

    if (intent.historical) {
      const legacyNeedles = Array.from(new Set([
        ...terms.filter(term => /\b(?:9184|2016|legacy|historical|lgu|manual|procurement)\b/i.test(term)).slice(0, 4),
        ...terms.slice(0, 3),
      ])).slice(0, 6);
      for (const needle of legacyNeedles) requests.push({ needle, types: LEGACY_TYPES, limit: 10 });
    }

    if (intent.institutional || intent.svpThreshold) {
      const internalNeedles = Array.from(new Set([
        ...(intent.svpThreshold ? ['200,000', 'Small Value Procurement', 'PhilGEPS'] : []),
        ...terms.slice(0, 4),
      ])).slice(0, 7);
      for (const needle of internalNeedles) requests.push({
        needle,
        types: intent.svpThreshold ? ['pmo_administrative_manual','procurement_manual'] : INTERNAL_TYPES,
        limit: 10,
      });
    }

    const results = await Promise.all(requests.map(async spec => {
      try {
        const result = await makeSearch(supabase, spec.needle, spec.types, spec.limit || 8);
        if (result.error) {
          console.warn('[Retrieval] Search notice:', result.error.message);
          return [];
        }
        return result.data || [];
      } catch (error) {
        console.warn('[Retrieval] Search request failed:', error);
        return [];
      }
    }));
    for (const result of results) for (const doc of result) addCandidate(candidates, doc, query, terms, phrases, intent);
  }

  const selected = selectResults(candidates, Math.max(1, limit), intent);
  let chunks: RetrievedChunk[] = selected.map(item => ({
    id: item.id,
    document_name: item.document_name,
    document_type: item.document_type,
    chunk_text: item.chunk_text,
    metadata: item.metadata,
    source_type: item.source_type,
    similarity: item.similarity,
  }));

  if (!chunks.length) {
    const localText = searchLocalDocs(query, limit);
    if (localText) chunks = [{
      document_name: 'Local procurement reference fallback',
      document_type: 'local_reference',
      chunk_text: localText,
      source_type: 'local_fallback',
    }];
  }

  const sources = Array.from(new Set(chunks.map(chunk => chunk.document_name).filter(Boolean)));
  const formattedChunks = chunks.map((chunk, index) => {
    const header = '[DOCUMENT EXCERPT ' + (index + 1) + ': ' + chunk.document_name.toUpperCase() + ' (' + chunk.document_type + ')]';
    const statusNote = sourceStatusNote(chunk);
    const metadataNote = typeof chunk.metadata?.authority_note === 'string'
      ? '[SOURCE-SPECIFIC WARNING: ' + String(chunk.metadata.authority_note) + ']'
      : '';
    return [header, statusNote, metadataNote, chunk.chunk_text].filter(Boolean).join('\n');
  });
  const notes: string[] = [];
  if (intent.svpThreshold) notes.push(svpAuthorityNote());
  const formattedContext = [...notes, ...formattedChunks].join('\n\n========================================\n\n');
  return { formattedContext, chunks, sources };
}
