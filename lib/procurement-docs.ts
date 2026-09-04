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
    { file: 'ra12009.txt', label: 'Government Procurement Guidelines (RA 12009 / RA 9184)' },
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

export function searchProcurementKnowledge(query: string, limit: number = 3): string {
  const chunks = loadLocalChunks();
  if (!chunks.length) return '';

  const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
  const keywords = cleanQuery.split(/\s+/).filter(w => w.length > 2 && !['what', 'when', 'where', 'which', 'about', 'how', 'the', 'and', 'for', 'are', 'with', 'from', 'this', 'that', 'can', 'you', 'please', 'tell'].includes(w));

  if (!keywords.length) {
    // Return key overview sections
    const overview = chunks.slice(0, limit);
    return overview.map(c => `[${c.source} - ${c.title}]\n${c.content}`).join('\n\n---\n\n');
  }

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
