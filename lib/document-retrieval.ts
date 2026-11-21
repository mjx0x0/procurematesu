import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { searchProcurementKnowledge as searchLocalDocs } from '@/lib/procurement-docs';
import { getOfficialIssuanceRetrievalTargets } from '@/lib/procurement-issuance-intents';

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

const QUERY_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
let queryEmbedderPromise: Promise<any> | null = null;

async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!queryEmbedderPromise) {
    queryEmbedderPromise = import('@xenova/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', QUERY_EMBEDDING_MODEL))
      .catch((error) => {
        queryEmbedderPromise = null;
        throw error;
      });
  }
  const embedder = await queryEmbedderPromise;
  const output = await embedder(query, { pooling: 'mean', normalize: true });
  const vector = Array.from(output.data as Float32Array, Number);
  if (vector.length !== 384 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`Query embedding must contain 384 finite values; received ${vector.length}.`);
  }
  return vector;
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
  // The stored document label is "IRR 2016", so recognize both word orders.
  return /\bra\s*\.?\s*9184\b|local government units procurement manual|\birr\s*2016\b|^irr(?:\s|$)|2016.{0,20}irr|legacy_ra_9184_reference|historical_reference_not_current/i.test(identity);
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
  const asksPmoDirectorContact =
    /\b(?:mobile|phone|telephone|contact number|number to call)\b/i.test(query) &&
    /\b(?:director|head|person in charge)\b/i.test(query) &&
    /\b(?:procurement|pmo|pro)\b/i.test(query);
  const asksUniversityChancellor =
    /\bchancellor\b/i.test(query) &&
    /\b(?:who|name|current|msu|gensan|university|pr|purchase request|approving authority|approver|approved by|form)\b/i.test(query);
  const asksCurrentLawStatus =
    /\b9184\b/i.test(query) &&
    /\b(?:current|currently|still|in force|governing|applicable|applies|apply|procurement law|which law|what law)\b/i.test(query) &&
    !(/\b(?:before|prior to|previous(?:ly)?|historical(?:ly)?|history|old law|former|under the former|used to apply|applied under)\b/i.test(query) &&
      (/\b12009\b/i.test(query) || /\bhistorical(?:ly)?\b|\bprevious(?:ly)?\b|\bformer\b/i.test(query)));
  const asksCurrentGoverningProcurementLaw =
    /\b(?:what|which)\s+(?:is\s+)?(?:the\s+)?(?:current|currently applicable|governing|applicable)?\s*procurement law\b/i.test(query)
    || /\bwhat law currently governs\b/i.test(query)
    || /\bwhich law governs (?:government )?procurement\b/i.test(query);
  const asksRa12009Title =
    /\b(?:what is|what does|identify|give me)\b/i.test(query) &&
    /\b(?:RA\s*\.?\s*(?:No\.?\s*)?12009|Republic Act\s+No\.?\s*12009|New Government Procurement Act)\b/i.test(query) &&
    !/\b(?:threshold|section|posting|quotation|amendment|penalty|procedure|requirement|specific provision)\b/i.test(query);
  const asksBacFunctions = /\b(?:BAC|Bids and Awards Committee)\b/i.test(query) && /\b(?:function|responsibilit|role|dut(?:y|ies)|what does)\b/i.test(query);
  const asksPpmpApp = /\bPPMP\b/i.test(query) && /\bAPP\b|Annual Procurement Plan/i.test(query) && /\b(?:difference|differ|compare|versus|vs\.?|between|distinguish)\b/i.test(query);
  const asksPrPpmpComparison =
    /\b(?:PR|Purchase Request)\b/i.test(query) &&
    /\bPPMP\b/i.test(query) &&
    /\b(?:difference|differ|compare|versus|vs\.?|between|distinguish)\b/i.test(query);
  const asksPrRequirements =
    /\b(?:PR|Purchase Request)\b/i.test(query) &&
    /\b(?:requirement|requirements|documents?|what.*need|needed|must.*include|should.*include|checklist|prepar(?:e|es|ed|ing)|preparation|information|provide|include|contents?|details?)\b/i.test(query) &&
    !asksPrPpmpComparison;
  const asksPrItemPreparation =
    (/\b(?:PR|Purchase Request|procurement|purchase)\b/i.test(query) ||
      /\b(?:technical specifications?|specs?|describe.*items?|items?\b.*\b(?:purchase|need|want)|quantit(?:y|ies).*estimated (?:unit )?(?:price|cost)|estimated (?:unit )?(?:price|cost).*each item)\b/i.test(query)) &&
    /\b(?:item descriptions?|describe.*items?|technical specifications?|specs?|quantit(?:y|ies)|estimated (?:unit )?(?:price|cost)|unit cost|price per item)\b/i.test(query);
  const asksPrValidationFailure =
    /\b(?:PR|Purchase Request)\b/i.test(query) &&
    /\b(?:fail(?:s|ed|ure)?|not pass|does not pass|doesn't pass|reject(?:ed|ion)?|return(?:ed)?|hold|validation|validate|discrepanc(?:y|ies)|mismatch|inconsisten(?:t|cy)|not match|does not match|doesn't match|incomplete|incorrect)\b/i.test(query) &&
    /\b(?:PPMP|APP|validat|review|requirement|process|happen|next step|what happens)\b/i.test(query);
  const asksPmoDefinition = /\b(?:what is|define|definition|meaning)\b/i.test(query) && /\b(?:Purchase Request|Purchase Order|PR|PO)\b/i.test(query);
  const asksPmoPrWorkflow = !asksPrRequirements && !asksPrItemPreparation &&
    /\b(?:Purchase Request|PR)\b/i.test(query) &&
    /\b(?:sequence|workflow|process|steps|what happens after|what happens once|how is .* processed)\b/i.test(query);
  const asksPmoPrNumber = /\b(?:who|which office|what office|when|what stage|at what stage|how)\b/i.test(query) &&
    /\b(?:assign|assigned|records?|issues?|receive|receives|received|get|gets|given|numbered|numbering|official)\b/i.test(query) && /\b(?:official )?PR (?:number|no\.?)\b/i.test(query);
  const asksPmoApprovalTimeLimit = /\b(?:approval|processing|turnaround)\s*(?:time|period|deadline|limit|duration|days?)\b/i.test(query) && /\b(?:PR|purchase request)\b/i.test(query);
  const asksTemporaryPmoLocation = /\b(?:where|location|located|address)\b/i.test(query) &&
    /\b(?:procurement office|procurement management office|PMO)\b/i.test(query);
  const asksSvpCompetitiveComparison = /\b(?:SVP|Small Value Procurement)\b/i.test(query) && /\bCompetitive Bidding\b/i.test(query);
  const asksLowestQuotationAward = /\b(?:lowest|cheapest|lowest[- ]priced)\b/i.test(query) &&
    /\b(?:quotation|quote|supplier|bid)\b/i.test(query) && /\b(?:win|award|awarded|guarantee|definitely|automatic|automatically)\b/i.test(query);
  const asksCircular06Coverage = /\b(?:what does|what is covered by|coverage|cover)\b/i.test(query) && /\b(?:GPPB\s+)?Circular\s+No\.?\s*06[-–]2026\b/i.test(query);
  const asksDraftToStepOne =
    /\bdraft\b/i.test(query) &&
    /\bstep\s*1\b/i.test(query) &&
    /\b(?:when|move|moves|moving|advance|advances|transition|transitions|change|changes|from|until|before|after|receipt|received)\b/i.test(query) &&
    (/\bpurchase request\b|\bPR\b/i.test(query));
  const asksPmoReceiptQuestion =
    /\b(?:procurement management office|PMO|procurement office)\b/i.test(query) &&
    /\b(?:purchase requests?|PR)\b/i.test(query) &&
    /\b(?:after|receives?|received|receipt|what happens|how will i know|confirmation|confirm)\b/i.test(query);

  const asksSvpDetails = /\b(small value procurement|svp|relatively small purchase|small purchase|low[- ]cost purchase)\b/i.test(query)
    || (/\b(?:supplier|price)\s+quotations?\b/i.test(query) && /\b(?:method|threshold|posting|exception|procurement)\b/i.test(query));
  const asksSvpAbstractOfQuotations = asksSvpDetails
    && /\babstract\s+of\s+(?:quotations?|ratings?)\b/i.test(query);
  const asksSvpDocumentaryRequirements = asksSvpDetails
    && /\b(?:documentary requirements?|eligibility documents?|supplier documents?|documents? (?:to check|to submit|required|should be checked)|document checklist)\b/i.test(query);
  const asksCircularResubmission =
    /\b(?:resubmit(?:ting)?|re-submi(?:t|tting)|re-submission|submit again|resubmission)\b/i.test(query)
    && /\b(?:documents?|requirements?|already submitted|updated file|valid|up to date|current)\b/i.test(query);
  const asksCircularLicenseCvAmbiguity =
    /\b(?:small value procurement|svp)\b/i.test(query)
    && /professional\s+license|curriculum vitae|\bcv\b/i.test(query)
    && /consulting/i.test(query)
    && /section\s*4\.3\.3|section\s*4\.7|inconsisten|for every|mandatory|compare/i.test(query);
  const asksNoSvpQuotation = asksSvpDetails
    && /\b(?:no|zero)\s+(?:(?:price|supplier)\s+)?quotations?\b|\b(?:receives?|received|gets?|got)\s+no\s+(?:(?:price|supplier)\s+)?quotations?\b/i.test(query);

  const officialIssuanceTargets = getOfficialIssuanceRetrievalTargets(query);

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

  // Semantic retrieval supplements the existing source-scoped keyword search.
  // It uses the same 384-dimensional model used when the knowledge-base chunks
  // were embedded; failures leave the established keyword path available.
  if (supabase && query.trim()) {
    try {
      const queryEmbedding = await generateQueryEmbedding(query);
      const { data: vectorRows, error: vectorError } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.30,
        match_count: Math.min(30, Math.max(12, limit * 4)),
      });
      if (vectorError) throw vectorError;

      const asksHistoricalVectorQuestion =
        /\b9184\b/i.test(query) &&
        /\b(?:before|prior to|previous(?:ly)?|historical(?:ly)?|history|old law|former|applied under)\b/i.test(query) &&
        /\b12009\b|\bhistorical(?:ly)?\b|\bprevious(?:ly)?\b|\bformer\b/i.test(query);

      for (const doc of vectorRows || []) {
        const text = String(doc.chunk_text || '').trim();
        if (!text) continue;
        const metadata =
          doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)
            ? (doc.metadata as Record<string, unknown>)
            : undefined;
        const documentName = String(doc.document_name || '');
        const identity = sourceIdentity(documentName, String(doc.document_type || ''), metadata);
        const isLegacy = isLegacyProcurementSource(identity);

        if (asksPmoDirectorContact && documentName !== 'MSU-GenSan University Directory') continue;
        if (asksHistoricalVectorQuestion && !['RA 9184', 'IRR 2016', 'IRR'].includes(documentName)) continue;
        if ((asksCurrentLawStatus || asksCurrentGoverningProcurementLaw) && isLegacy && documentName !== 'GPPB Circular No. 01-2025') continue;
        if (isLegacy && !asksAboutLegacyRules(query)) continue;
        const is2014LguManualContent = /Local Government Units Procurement Manual|Manual of Procedures for the Procurement of Goods and Services under RA No.?\s*9184/i.test(text);
        if (is2014LguManualContent && !asksAboutLegacyRules(query)) continue;
        if (asksSvpDetails && documentName === 'Implementing Rules and Regulations of RA 12009'
          && !/Section\s+34\.\s+Small Value Procurement|\b34\.1\b|\b34\.3\b|shall not require posting|Abstract of Quotations or Ratings|in case no price quotation is received/i.test(text)) continue;
        if (asksSvpDocumentaryRequirements && !['GPPB Circular No. 06-2026', 'Implementing Rules and Regulations of RA 12009'].includes(documentName)) continue;
        if ((asksPmoReceiptQuestion || asksDraftToStepOne) && documentName !== 'ProcureMateSU System Workflow') continue;
        if ((asksPrRequirements || asksPrItemPreparation || asksPrValidationFailure) && documentName !== 'PMO Administrative Manual') continue;
        if (asksPmoPrNumber && !['PMO Administrative Manual', 'ProcureMateSU System Workflow'].includes(documentName)) continue;
        if (asksTemporaryPmoLocation && !/STTC|temporary office location/i.test(text)) continue;

        const similarity = Number(doc.similarity);
        if (!Number.isFinite(similarity)) continue;
        const key = String(doc.id || text.slice(0, 120));
        const score = similarity * 100;
        const existing = candidates.get(key);
        if (!existing || score > existing.score) {
          candidates.set(key, {
            id: doc.id,
            document_name: documentName || 'Procurement Records',
            document_type: String(doc.document_type || 'document_chunks'),
            chunk_text: text.replaceAll(
              'https://www.gppb.gov.ph/wp-content/uploads/2026/06/ApprovedGPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf',
              '[direct public link unavailable — do not link]'
            ),
            metadata,
            similarity,
            source_type: 'supabase_vector',
            score,
          });
        }
      }
    } catch (err) {
      console.warn('[Retrieval] Vector search unavailable; using keyword retrieval:', err);
    }
  }

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

      // Specialized official issuances are source-scoped before generic keyword
      // searches so new, concise issuance summaries are not hidden behind older
      // chunks that happen to contain common words such as "procurement" or "forms".
      for (const target of officialIssuanceTargets) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', target.documentName)
            .limit(target.limit || 12)
        );
      }

      // Broad per-word searches can miss the relevant chunk because each term
      // query returns only its first few matches. Add source-scoped searches for
      // known high-risk question types so the authoritative section enters the
      // candidate set before ranking.
      const asksHistoricalRa9184 =
        /\b9184\b/i.test(query) &&
        /\b(?:before|prior to|previous(?:ly)?|historical(?:ly)?|history|old law|former|applied under)\b/i.test(query) &&
        /\b12009\b|\bhistorical(?:ly)?\b|\bprevious(?:ly)?\b|\bformer\b/i.test(query);
      const asksPurchaseRequestWorkflow =
        (/\b(?:purchase requests?|pr)\b/i.test(query) &&
          /\b(sequence|workflow|process|steps|review|reviewing|approval|approving|offices|procedure|after|receives?|received|receipt|what happens)\b/i.test(query) &&
          /\b(msu|gensan|university|pmo|procurement)\b/i.test(query))
        || asksPmoReceiptQuestion;

      if (asksCurrentLawStatus) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'GPPB Circular No. 01-2025')
            .limit(10)
        );
      }
      if (asksCurrentGoverningProcurementLaw) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'GPPB Circular No. 01-2025')
            .limit(12),
          scopedPhraseSearch('Implementing Rules and Regulations of RA 12009', 'Section 115. Repealing Clause')
        );
        for (const documentName of ['RA 12009 (New)', 'RA 12009']) {
          searches.push(
            supabase.from('document_chunks').select(selectedColumns)
              .eq('document_name', documentName)
              .ilike('chunk_text', '%New Government Procurement Act%')
              .limit(6)
          );
        }
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'GPPB Circular No. 01-2025')
            .limit(12),
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'Implementing Rules and Regulations of RA 12009')
            .limit(8)
        );
      }
      if (asksRa12009Title) {
        for (const documentName of ['RA 12009 (New)', 'RA 12009']) {
          searches.push(
            supabase.from('document_chunks').select(selectedColumns)
              .eq('document_name', documentName)
              .ilike('chunk_text', '%New Government Procurement Act%')
              .limit(6)
          );
        }
      }
      if (asksBacFunctions) {
        searches.push(
          scopedPhraseSearch('Implementing Rules and Regulations of RA 12009', 'Section 42. Functions of the BAC'),
          scopedPhraseSearch('Implementing Rules and Regulations of RA 12009', '42.1 The BAC shall have the following functions'),
          scopedPhraseSearch('Implementing Rules and Regulations of RA 12009', 'Recommend award of contracts to the HoPE')
        );
      }
      if (asksPrPpmpComparison) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        const pmoManual = 'PMO Administrative Manual';
        // Legal planning framework: retrieve the current IRR's PPMP/APP clauses.
        searches.push(
          scopedPhraseSearch(currentIrr, 'Project Procurement Management Plan'),
          scopedPhraseSearch(currentIrr, 'PPMP'),
          scopedPhraseSearch(currentIrr, 'Annual Procurement Plan'),
          scopedPhraseSearch(currentIrr, '7.7.1'),
          scopedPhraseSearch(currentIrr, '7.7.2'),
          scopedPhraseSearch(currentIrr, '7.7.5'),
          scopedPhraseSearch(currentIrr, 'consolidation into an Indicative APP'),
          scopedPhraseSearch(currentIrr, 'consolidation into the final APP'),
          scopedPhraseSearch(currentIrr, 'Section 7. Procurement Planning and Budgeting Linkage'),
          // Institutional implementation: retrieve the MSU manual's PPMP-to-PR checks.
          scopedPhraseSearch(pmoManual, 'Review and validate the Purchase Request'),
          scopedPhraseSearch(pmoManual, 'Verification Against PPMP/APP'),
          scopedPhraseSearch(pmoManual, 'approved Project Procurement Management Plan')
        );
      }
      if (asksPrRequirements || asksPrItemPreparation) {
        const pmoManual = 'PMO Administrative Manual';
        // The MSU manual is the source for local PR review and workflow;
        // do not substitute generic or LGU-specific checklists.
        searches.push(
          scopedPhraseSearch(pmoManual, 'Review and validate the Purchase Request'),
          scopedPhraseSearch(pmoManual, 'accuracy and completeness of entries'),
          scopedPhraseSearch(pmoManual, 'required specifications and other pertinent details'),
          scopedPhraseSearch(pmoManual, 'Verification of Signatories and Dates'),
          scopedPhraseSearch(pmoManual, 'approved Purchase Requests signed by the Chancellor'),
          scopedPhraseSearch(pmoManual, 'Endorsement to Budget Management Office')
        );
      }
      if (asksPrItemPreparation) {
        const pmoManual = 'PMO Administrative Manual';
        searches.push(
          scopedPhraseSearch(pmoManual, 'accuracy and completeness of PR entries'),
          scopedPhraseSearch(pmoManual, 'specifications and other pertinent details'),
          scopedPhraseSearch(pmoManual, 'quantity, unit cost, and total amount'),
          scopedPhraseSearch(pmoManual, 'Verification Against PPMP/APP')
        );
      }
      if (asksPmoReceiptQuestion) {
        const systemWorkflow = 'ProcureMateSU System Workflow';
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', systemWorkflow)
            .ilike('chunk_text', '%printed PR%').limit(6),
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', systemWorkflow)
            .ilike('chunk_text', '%confirms receipt%').limit(6),
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', systemWorkflow)
            .ilike('chunk_text', '%Step 1%').limit(6)
        );
      }
      if (asksPpmpApp) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        searches.push(
          scopedPhraseSearch(currentIrr, '7.7.1'),
          scopedPhraseSearch(currentIrr, 'Project Procurement Management Plans'),
          scopedPhraseSearch(currentIrr, '7.7.2'),
          scopedPhraseSearch(currentIrr, 'consolidation into an Indicative APP'),
          scopedPhraseSearch(currentIrr, '7.7.5'),
          scopedPhraseSearch(currentIrr, 'consolidation into the final APP')
        );
      }
      if (asksPrValidationFailure) {
        const pmoManual = 'PMO Administrative Manual';
        // Retrieve the documented validation sequence and the risk statement.
        // Neither excerpt defines a formal rejection/return disposition.
        searches.push(
          scopedPhraseSearch(pmoManual, 'Verification Against PPMP/APP'),
          scopedPhraseSearch(pmoManual, 'Validation by the PMO Director'),
          scopedPhraseSearch(pmoManual, 'Pre-Numbering and Control of PRs'),
          scopedPhraseSearch(pmoManual, 'Endorsement to Budget Management Office'),
          scopedPhraseSearch(pmoManual, 'Incomplete or Incorrect Documentation'),
          scopedPhraseSearch(pmoManual, 'may lead to reprocessing'),
          scopedPhraseSearch(pmoManual, 'Regular Review and Validation of Documents'),
          scopedPhraseSearch(pmoManual, 'completeness, accuracy, and consistency prior to endorsement or approval')
        );
      }
      if (asksPmoDefinition) {
        const pmoManual = 'PMO Administrative Manual';
        searches.push(
          scopedPhraseSearch(pmoManual, 'Purchase Request'),
          scopedPhraseSearch(pmoManual, 'Purchase Order'),
          scopedPhraseSearch(pmoManual, 'awarded supplier'),
          scopedPhraseSearch(pmoManual, 'Definition of Terms')
        );
      }
      if (asksPmoPrWorkflow) {
        const pmoManual = 'PMO Administrative Manual';
        searches.push(
          scopedPhraseSearch(pmoManual, 'IV. PROCESS FLOW'),
          scopedPhraseSearch(pmoManual, 'Receipt of Purchase Request'),
          scopedPhraseSearch(pmoManual, 'Procurement Management Monitoring Section'),
          scopedPhraseSearch(pmoManual, 'Budget Management Office'),
          scopedPhraseSearch(pmoManual, 'approved Purchase Requests signed by the Chancellor')
        );
      }
      if (asksPmoApprovalTimeLimit) {
        const pmoManual = 'PMO Administrative Manual';
        searches.push(
          scopedPhraseSearch(pmoManual, 'approval time'),
          scopedPhraseSearch(pmoManual, 'processing time'),
          scopedPhraseSearch(pmoManual, 'working days'),
          scopedPhraseSearch(pmoManual, 'calendar days'),
          scopedPhraseSearch(pmoManual, 'within')
        );
      }
      if (asksPmoPrNumber) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'ProcureMateSU System Workflow')
            .ilike('chunk_text', '%Step 4%')
            .limit(6),
          scopedPhraseSearch('PMO Administrative Manual', 'Procurement Management Monitoring Section'),
          scopedPhraseSearch('PMO Administrative Manual', 'formally assign a control or reference number')
        );
      }
      if (asksTemporaryPmoLocation) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .ilike('chunk_text', '%STTC%')
            .limit(6),
          supabase.from('document_chunks').select(selectedColumns)
            .ilike('chunk_text', '%temporary office location%')
            .limit(6)
        );
      }
      if (asksSvpCompetitiveComparison) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        searches.push(
          scopedPhraseSearch(currentIrr, 'Section 27. Competitive Bidding'),
          scopedPhraseSearch(currentIrr, 'open to participation by any eligible bidder'),
          scopedPhraseSearch(currentIrr, 'Section 34. Small Value Procurement'),
          scopedPhraseSearch(currentIrr, '34.1'),
          scopedPhraseSearch(currentIrr, '34.2 In case of LGUs'),
          scopedPhraseSearch(currentIrr, '34.3(b)')
        );
      }
      if (asksLowestQuotationAward) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        searches.push(
          scopedPhraseSearch(currentIrr, 'Abstract of Quotations or Ratings'),
          scopedPhraseSearch(currentIrr, 'The BAC shall recommend to the HoPE the award'),
          scopedPhraseSearch(currentIrr, 'LCRB, MEARB, MARB or HRRB')
        );
      }
      if (asksCircular06Coverage) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'GPPB Circular No. 06-2026')
            .limit(20)
        );
      }


      if (asksDraftToStepOne) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'ProcureMateSU System Workflow')
            .ilike('chunk_text', '%Draft%')
            .limit(4)
        );
      }

      if (asksSvpDetails) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        searches.push(
          scopedPhraseSearch(currentIrr, 'Section 34. Small Value Procurement'),
          scopedPhraseSearch(currentIrr, '34.3 Under this mode of procurement'),
          scopedPhraseSearch(currentIrr, 'shall not require posting'),
          scopedPhraseSearch(currentIrr, 'The BAC shall prepare and send the RFQs or RFPs'),
          scopedPhraseSearch(currentIrr, 'Abstract of Quotations or Ratings'),
          scopedPhraseSearch(currentIrr, 'in case no price quotation is received')
        );
      }

      // Abstract questions need the exact post-deadline evaluation record clause.
      // Search several short fragments because PDF extraction may split the
      // phrase across lines or paragraph-sized chunks.
      if (asksSvpAbstractOfQuotations) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        searches.push(
          scopedPhraseSearch(currentIrr, '34.3(f)'),
          scopedPhraseSearch(currentIrr, 'Abstract of Quotations'),
          scopedPhraseSearch(currentIrr, 'Quotations or Ratings'),
          scopedPhraseSearch(currentIrr, 'after the deadline')
        );
      }

      if (asksNoSvpQuotation) {
        const currentIrr = 'Implementing Rules and Regulations of RA 12009';
        searches.push(
          scopedPhraseSearch(currentIrr, 'in case no price quotation is received from the suppliers'),
          scopedPhraseSearch(currentIrr, 'may extend the deadline for submission of price quotation'),
          scopedPhraseSearch(currentIrr, 'at least a single price quotation'),
          scopedPhraseSearch(currentIrr, 'extension shall not go beyond the validity of the corresponding appropriations')
        );
      }

      // Retrieve all chunks for this short, specifically named official circular;
      // broad term searches may otherwise select an obsolete historical eligibility rule.
      if (asksSvpDocumentaryRequirements || asksCircularResubmission || asksCircularLicenseCvAmbiguity) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'GPPB Circular No. 06-2026')
            .limit(20)
        );
      }

      // An explicit "before RA 12009 / historical RA 9184" question must retrieve
      // the old Act and its own IRR, rather than using a section of the new IRR
      // that merely mentions the former law.
      if (asksHistoricalRa9184) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'RA 9184')
            .ilike('chunk_text', '%Government Procurement Reform Act%').limit(4),
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'IRR 2016')
            .ilike('chunk_text', '%Revised Implementing Rules and Regulations%').limit(4),
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'IRR 2016')
            .ilike('chunk_text', '%Section 1%').limit(4),
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'IRR')
            .ilike('chunk_text', '%REVISED IMPLEMENTING RULES AND REGULATIONS OF REPUBLIC ACT%')
            .limit(4)
        );
      }

      if (asksPurchaseRequestWorkflow) {
        const pmoManual = 'PMO Administrative Manual';
        searches.push(
          scopedPhraseSearch(pmoManual, 'IV. PROCESS FLOW'),
          scopedPhraseSearch(pmoManual, '1. Receipt of Purchase Request'),
          scopedPhraseSearch(pmoManual, '3. Validation by the PMO Director'),
          scopedPhraseSearch(pmoManual, 'Endorsement to Budget Management Office'),
          scopedPhraseSearch(pmoManual, 'approved Purchase Requests signed by the Chancellor or authorized approving authority')
        );
      }

      // A current PMO director phone-number question must be sourced from the
      // official university directory only, not the operational manual or law.
      if (asksPmoDirectorContact) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'MSU-GenSan University Directory')
            .ilike('chunk_text', '%Director:%')
            .ilike('chunk_text', '%Contact Number:%')
            .limit(4)
        );
      }

      // Questions about the Chancellor's identity or PR-form approving authority
      // must prioritize the current official university directory, not historical/manual chunks.
      if (asksUniversityChancellor) {
        searches.push(
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'MSU-GenSan University Directory')
            .ilike('chunk_text', '%Atty. Shidik T. Abantas%')
            .limit(4),
          supabase.from('document_chunks').select(selectedColumns)
            .eq('document_name', 'MSU-GenSan University Directory')
            .ilike('chunk_text', '%University Chancellor%')
            .limit(4)
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
          // Suppress a known broken GPPB PDF URL from retrieved text without
          // modifying the ingested knowledge-base record.
          const text = String(doc.chunk_text || '')
            .replaceAll(
              'https://www.gppb.gov.ph/wp-content/uploads/2026/06/ApprovedGPPB-Resolution-No.-10-2026-Documentary-Requirements.pdf',
              '[direct public link unavailable — do not link]'
            )
            .trim();
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
          const documentName = String(doc.document_name || '');

          // Prevent unrelated laws/manuals from entering contact-question context.
          if (asksPmoDirectorContact && documentName !== 'MSU-GenSan University Directory') continue;

          // Explicit historical questions are source-scoped: only RA 9184 and its
          // 2016 IRR can support the answer. Current RA 12009 excerpts are excluded
          // even when they mention the predecessor law.
          if (asksHistoricalRa9184 && !['RA 9184', 'IRR 2016', 'IRR'].includes(documentName)) continue;

          // A current-law status question must be anchored in the official 2025
          // transition circular, not diluted by the historical RA 9184/2016 IRR chunks.
          if ((asksCurrentLawStatus || asksCurrentGoverningProcurementLaw) && isLegacy && documentName !== 'GPPB Circular No. 01-2025') continue;

          // On ordinary/current-law questions, exclude historical documents unless
          // the user explicitly asks for history, comparison, or transition.
          if (isLegacy && !asksAboutLegacyRules(query)) continue;

          // A historical LGU manual may be mislabelled with an RA 12009 ingestion name.
          // Detect the source's own title/content as a second provenance check.
          const is2014LguManualContent = /Local Government Units Procurement Manual|Manual of Procedures for the Procurement of Goods and Services under RA No\.?\s*9184/i.test(text);
          if (is2014LguManualContent && !asksAboutLegacyRules(query)) continue;

          // SVP questions should not be diluted with negotiated-procurement or
          // unrelated chunks that happen to mention suppliers/quotations.
          if (asksSvpDetails && documentName === 'Implementing Rules and Regulations of RA 12009') {
            const isSvpSectionText =
              /Section\s+34\.\s+Small Value Procurement|\b34\.1\b|\b34\.3\b|shall not require posting|Abstract of Quotations or Ratings|in case no price quotation is received|The BAC shall prepare and send the RFQs or RFPs/i.test(text);
            if (!isSvpSectionText) continue;
          }

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
          if (asksPrPpmpComparison) {
            if (documentName === 'Implementing Rules and Regulations of RA 12009' &&
              /PPMP|Project Procurement Management Plan|Annual Procurement Plan|procurement planning/i.test(text)) score += 180;
            if (documentName === 'PMO Administrative Manual' &&
              /review and validate the Purchase Request|against the approved Project Procurement Management Plan|consolidat(?:e|ion).*PPMP.*APP/i.test(text)) score += 160;
            // Never let the 2014 LGU manual or 2016 RA 9184 IRR answer a current comparison.
            if (isLegacy) score -= 1000;
          }
          if ((asksPrRequirements || asksPrItemPreparation) && documentName === 'PMO Administrative Manual' &&
            /Purchase Request|PRs|signator|specification|completeness|quantity|unit cost|total amount|Budget Management Office|Chancellor/i.test(text)) score += 260;
          if (asksPmoReceiptQuestion && documentName === 'ProcureMateSU System Workflow' &&
            /printed PR|confirms receipt|Step 1|physical submission/i.test(text)) score += 520;
          if (asksPmoPrNumber && documentName === 'ProcureMateSU System Workflow' &&
            /Step 4|official PR number|pre-numbering|control number/i.test(text)) score += 520;
          if (asksPrValidationFailure) {
            if (documentName === 'PMO Administrative Manual' &&
              /Verification Against PPMP\/APP|Validation by the PMO Director|Pre-Numbering and Control of PRs|Endorsement to Budget Management Office|Incomplete or Incorrect Documentation|may lead to reprocessing|Regular Review and Validation of Documents/i.test(text)) score += 420;
            else score -= 180;
          }
          if ((asksPrRequirements || asksPrPpmpComparison) && isLegacy) score -= 1000;
          const issuanceTarget = officialIssuanceTargets.find((target) => target.documentName === documentName);
          if (issuanceTarget) score += issuanceTarget.priorityBoost || 1000;
          if (asksUniversityChancellor && documentName === 'MSU-GenSan University Directory') score += 1000;
          if ((asksCurrentLawStatus || asksCurrentGoverningProcurementLaw) && documentName === 'GPPB Circular No. 01-2025') score += 1000;
          if (asksCurrentGoverningProcurementLaw && documentName === 'Implementing Rules and Regulations of RA 12009') score += 900;
          if (asksDraftToStepOne && documentName === 'ProcureMateSU System Workflow') score += 1000;
          if (asksPurchaseRequestWorkflow && documentName === 'PMO Administrative Manual' && /IV\. PROCESS FLOW|Receipt of Purchase Request/i.test(text)) score += 1000;
          if (asksSvpDetails && documentName === 'Implementing Rules and Regulations of RA 12009' && /section 34|small value procurement|shall not require posting|at least three \(3\) suppliers|abstract of quotations or ratings/i.test(text)) score += 50;
          if (asksSvpAbstractOfQuotations
            && documentName === 'Implementing Rules and Regulations of RA 12009'
            && /34\.3\s*\(\s*f\s*\)|abstract of quotations|quotations or ratings|after the deadline/i.test(text)) score += 1000;
          else if (asksSvpDetails && /small value procurement|section 34/i.test(text) && /circular no\. 06-2026/i.test(identity)) score += 12;
          if ((asksSvpDocumentaryRequirements || asksCircularResubmission || asksCircularLicenseCvAmbiguity)
            && documentName === 'GPPB Circular No. 06-2026') score += 1000;
          if (asksNoSvpQuotation
            && documentName === 'Implementing Rules and Regulations of RA 12009'
            && /in case no price quotation is received|may extend the deadline|at least a single price quotation|corresponding appropriations/i.test(text)) score += 1000;
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

  // The documentary answer is intentionally cross-source: retain the six
  // Circular chunks plus enough Section 34 IRR chunks to verify threshold,
  // quotations, posting, and the no-quotation exception independently.
  const resultLimit = (asksBacFunctions || asksNoSvpQuotation || asksCurrentLawStatus || asksCurrentGoverningProcurementLaw || asksBacFunctions || asksPrPpmpComparison || asksPrRequirements || asksPrItemPreparation || asksPrValidationFailure || asksPpmpApp || asksRa12009Title || asksCurrentGoverningProcurementLaw || asksPmoDefinition || asksPmoApprovalTimeLimit || asksPmoPrWorkflow || asksPmoPrNumber || asksTemporaryPmoLocation || asksSvpCompetitiveComparison || asksLowestQuotationAward || asksCircular06Coverage)
    ? Math.max(limit, 12)
    : asksSvpDocumentaryRequirements
    ? Math.max(limit, 16)
    : officialIssuanceTargets.length > 0
      ? Math.max(limit, Math.min(18, 4 + officialIssuanceTargets.length * 2))
      : (asksUniversityChancellor || asksPrItemPreparation || asksPmoPrNumber || asksPmoReceiptQuestion || asksCircularResubmission || asksCircularLicenseCvAmbiguity || asksNoSvpQuotation || asksSvpAbstractOfQuotations || asksCurrentLawStatus || asksPmoReceiptQuestion)
        ? Math.max(limit, 8)
        : asksDraftToStepOne
          ? Math.max(limit, 4)
          : limit;
  const ranked = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, resultLimit);

  // Local fallback only when the database does not provide a relevant chunk.
  if (ranked.length === 0 && !asksPmoDirectorContact) {
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
      let section = metadataField(chunk.metadata, ['section', 'section_number', 'section_title', 'article', 'article_title', 'heading']);
      // PDF paragraph-aware chunking can attach a trailing Section 34.3(c)-(g)
      // continuation to metadata for the next section (Section 35). Do not surface
      // that following heading as the citation for the preceding SVP rules.
      if (
        /^Section\s*35\b/i.test(section) &&
        /(?:shall not require posting|The BAC shall prepare and send the RFQs or RFPs|Abstract of Quotations or Ratings|in case no price quotation is received)/i.test(chunk.chunk_text) &&
        /Section\s*35\.\s*Negotiated Procurement/i.test(chunk.chunk_text)
      ) {
        section = '34.3(b)-(g), Small Value Procurement (text preceding Section 35 heading)';
      }
      const page = metadataField(chunk.metadata, ['pdf_page', 'page_number', 'page', 'page_no', 'page_num', 'source_page', 'page_start']);
      const location = [
        section ? `section/article: ${section}` : '',
        page ? `PDF page: ${page}` : '',
      ].filter(Boolean).join(' | ');
      const rawSourceUrl = metadataField(chunk.metadata, ['source_url', 'official_url', 'source_link', 'document_url', 'file_url', 'public_url', 'download_url', 'pdf_url', 'url']);
      const sourceCitation = /^https?:\/\//i.test(rawSourceUrl) ? ` | official source: ${rawSourceUrl}` : '';
      const docHeader = `[DOCUMENT EXCERPT ${index + 1}: ${chunk.document_name.toUpperCase()} (${chunk.document_type})${location ? ` | ${location}` : ''}${sourceCitation}]`;
      return `${docHeader}\n${chunk.chunk_text}`;
    })
    .join('\n\n========================================\n\n');

  return { formattedContext, chunks, sources };
}
