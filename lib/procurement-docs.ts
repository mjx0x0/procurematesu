import fs from 'fs';
import path from 'path';

interface DocChunk {
  source: string;
  title: string;
  content: string;
}

let cachedChunks: DocChunk[] | null = null;

function loadLocalChunks(): DocChunk[] {
  if (cachedChunks) return cachedChunks;

  const chunks: DocChunk[] = [];
  const dataDir = path.join(process.cwd(), 'data');

  const filesToLoad = [
    { file: 'procurement_manual.txt', label: 'MSU-GenSan PMO Operations Manual' },
    { file: 'new_ra12009.txt', label: 'Republic Act No. 12009 (New Government Procurement Act)' },
    { file: 'ra12009.txt', label: 'Local Government Units Procurement Manual (2014) — historical RA 9184 reference' },
  ];

  for (const { file, label } of filesToLoad) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) continue;

    try {
      const rawText = fs.readFileSync(filePath, 'utf-8');
      // Split by double newlines or section patterns
      const paragraphs = rawText.split(/\n\s*\n/);
      let currentChunk = '';
      let currentHeader = label;

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Check if paragraph looks like a header
        if (/^(SECTION|ARTICLE|SEC\.|TABLE OF CONTENTS|[I|V|X]+\.|\b[A-Z\s]{4,}\b)/i.test(trimmed) && trimmed.length < 120) {
          if (currentChunk.length > 300) {
            chunks.push({
              source: label,
              title: currentHeader,
              content: currentChunk.trim(),
            });
            currentChunk = '';
          }
          currentHeader = trimmed.replace(/\n+/g, ' ');
        }

        currentChunk += '\n\n' + trimmed;

        if (currentChunk.length >= 1000) {
          chunks.push({
            source: label,
            title: currentHeader,
            content: currentChunk.trim(),
          });
          currentChunk = '';
        }
      }

      if (currentChunk.length > 100) {
        chunks.push({
          source: label,
          title: currentHeader,
          content: currentChunk.trim(),
        });
      }
    } catch (err) {
      console.warn(`Failed reading ${file}:`, err);
    }
  }

  cachedChunks = chunks;
  return chunks;
}

function isLegacySourceLabel(source: string): boolean {
  return /local government units procurement manual|ra\s*\.?\s*9184|2016.{0,20}irr|legacy_ra_9184_reference/i.test(source);
}

function asksAboutLegacyRules(query: string): boolean {
  return /\bra\s*\.?\s*9184\b|\b9184\b|2016\s*(revised\s*)?irr|transition|transitory|transitional|legacy|previous law|old procurement/i.test(query);
}

export function searchProcurementKnowledge(query: string, limit: number = 3): string {
  const allChunks = loadLocalChunks();
  if (!allChunks.length) return '';

  const asksLegacy = asksAboutLegacyRules(query);
  const chunks = allChunks.filter(chunk => asksLegacy || !isLegacySourceLabel(chunk.source));
  if (!chunks.length) return '';

  const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
  const keywords = cleanQuery.split(/\s+/).filter(w => w.length > 2 && !['what', 'when', 'where', 'which', 'about', 'how', 'the', 'and', 'for', 'are', 'with', 'from', 'this', 'that', 'can', 'you', 'please', 'tell'].includes(w));

  // A retrieval request with no meaningful search terms is not evidence that
  // an overview passage answers the user's question.
  if (!keywords.length) return '';

  const scored = chunks.map(chunk => {
    let score = 0;
    const textLower = chunk.content.toLowerCase();
    const titleLower = chunk.title.toLowerCase();

    // Exact query phrase boost
    if (textLower.includes(cleanQuery.trim())) score += 20;

    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 8;
      const count = (textLower.match(new RegExp(`\\b${kw}`, 'gi')) || []).length;
      score += Math.min(count * 2, 10);
    }

    // Specific domain keywords
    if (query.match(/12009/i) && (textLower.includes('12009') || titleLower.includes('12009'))) score += 15;
    if (query.match(/svp|small value/i) && (textLower.includes('small value') || textLower.includes('svp'))) score += 15;
    if (query.match(/bidding/i) && textLower.includes('bidding')) score += 10;
    if (query.match(/pr|purchase request/i) && textLower.includes('purchase request')) score += 10;
    if (query.match(/threshold/i) && textLower.includes('threshold')) score += 10;
    if (query.match(/msu|gensan/i) && (textLower.includes('mindanao state') || textLower.includes('msu'))) score += 10;

    const asksLegal = /\b(ra\s*\.?\s*12009|ra\s*\.?\s*9184|law|legal|regulation|irr|threshold|svp|small value|bidding|procurement mode|section|article|deadline|posting|quotation|eligibility)\b/i.test(query);
    const asksInstitutional = /\b(msu|gensan|university|pmo|pro|procurement office|chancellor|budget office|purchase request|pr|workflow|process|approval|logbook|director|office)\b/i.test(query);
    if (asksLegal && /ra no\.? 12009|ra 12009|new government procurement act/i.test(chunk.source)) score += 18;
    if (asksInstitutional && /msu.*pmo|pmo operations manual|administrative manual/i.test(chunk.source)) score += 14;
    if (isLegacySourceLabel(chunk.source) && asksLegacy) score += 2;

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.filter(s => s.score > 0).slice(0, limit);
  if (!top.length) {
    return '';
  }

  return top
    .map(s => `[Source: ${s.chunk.source} | Section: ${s.chunk.title}]\n${s.chunk.content}`)
    .join('\n\n---\n\n');
}
