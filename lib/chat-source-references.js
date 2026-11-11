'use strict';

const SOURCE_URL_KEYS = [
  'source_url',
  'official_url',
  'source_link',
  'document_url',
  'file_url',
  'public_url',
  'download_url',
  'pdf_url',
  'url',
];
const SECTION_KEYS = ['section', 'section_number', 'section_title', 'article', 'article_title', 'heading'];
const PAGE_KEYS = ['pdf_page', 'page_number', 'page', 'page_no', 'page_num', 'source_page', 'page_start'];

function metadataValue(metadata, keys) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return '';
}

function validateSourceUrl(value) {
  const raw = String(value || '').trim().replace(/[)\].,;]+$/, '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function extractReferencedSourceNames(conversationContext) {
  const context = String(conversationContext || '');
  const names = new Set();

  const excerptPattern = /DOCUMENT EXCERPT\s+\d+\s*:\s*([^\](\n]+)/gi;
  for (const match of context.matchAll(excerptPattern)) {
    const name = String(match[1] || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (name) names.add(name);
  }

  const referencesIndex = context.toLowerCase().lastIndexOf('references');
  if (referencesIndex >= 0) {
    const referenceText = context.slice(referencesIndex + 'references'.length);
    for (const segment of referenceText.split(/[•●▪]/)) {
      const cleaned = segment.replace(/^[\s:;,-]+/, '').trim();
      if (!cleaned) continue;
      const title = cleaned
        .split(/,\s*(?=(?:section\b|article\b|iv\.|v\.|vi\.|pdf\s+page\b|page\b))/i)[0]
        .split(/\s+[–—]\s+/)[0]
        .trim();
      if (title && title.length <= 140) names.add(title);
    }
  }

  return Array.from(names);
}

function buildSourceReferenceEntries(chunks, conversationContext = '') {
  const sourceNames = extractReferencedSourceNames(conversationContext);
  const normalizedContext = String(conversationContext || '').toLocaleLowerCase();
  const entries = new Map();

  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    const documentName = String(chunk?.document_name || '').trim();
    if (!documentName) continue;

    const wasCited = sourceNames.some((name) =>
      normalizedContext.includes(name.toLocaleLowerCase()) &&
      (documentName.toLocaleLowerCase() === name.toLocaleLowerCase()
        || documentName.toLocaleLowerCase().includes(name.toLocaleLowerCase())
        || name.toLocaleLowerCase().includes(documentName.toLocaleLowerCase()))
    );
    if (sourceNames.length && !wasCited) continue;

    const metadata = chunk.metadata;
    const url = validateSourceUrl(metadataValue(metadata, SOURCE_URL_KEYS));
    const section = metadataValue(metadata, SECTION_KEYS);
    const page = metadataValue(metadata, PAGE_KEYS);
    const key = documentName.toLocaleLowerCase();
    const existing = entries.get(key) || {
      documentName,
      url: '',
      sections: new Set(),
      pages: new Set(),
    };

    if (!existing.url && url) existing.url = url;
    if (section) existing.sections.add(section);
    if (page) existing.pages.add(page);
    entries.set(key, existing);
  }

  return Array.from(entries.values()).map((entry) => ({
    documentName: entry.documentName,
    url: entry.url,
    sections: Array.from(entry.sections),
    pages: Array.from(entry.pages),
  }));
}

function buildReferenceLinksResponse(chunks, conversationContext = '') {
  const entries = buildSourceReferenceEntries(chunks, conversationContext);
  const names = extractReferencedSourceNames(conversationContext);
  const references = entries.length
    ? entries
    : names.map((documentName) => ({ documentName, url: '', sections: [], pages: [] }));

  if (!references.length) {
    return [
      'I can provide direct links when the source record includes a verified document URL.',
      'I could not identify the exact source entries from the recent conversation. Please ask me which reference you want linked, or share its title.',
    ].join('\n\n');
  }

  const lines = references.map((reference) => {
    const details = [
      ...reference.sections,
      ...reference.pages.map((page) => 'PDF page ' + page),
    ];
    const detailText = details.length ? ' — ' + Array.from(new Set(details)).join('; ') : '';
    if (reference.url) {
      return '- [' + reference.documentName + '](' + reference.url + ')' + detailText;
    }
    return '- **' + reference.documentName + '**' + detailText + ' — no shareable URL is currently stored for this source in the knowledge base.';
  });

  const hasLinks = references.some((reference) => reference.url);
  const noLinkCount = references.filter((reference) => !reference.url).length;
  const intro = hasLinks
    ? 'Here are the links I could verify from the sources cited in my previous answer:'
    : 'I found the cited source titles, but the knowledge base does not currently contain a shareable document URL for them.';
  const caveat = noLinkCount
    ? '\n\nI will not guess or fabricate a link. For an internal MSU document without a stored URL, ask the Procurement Office or have the system administrator attach the original PDF/share link to its knowledge-base record.'
    : '';
  return [intro, ...lines, caveat].filter(Boolean).join('\n\n');
}

module.exports = {
  validateSourceUrl,
  extractReferencedSourceNames,
  buildSourceReferenceEntries,
  buildReferenceLinksResponse,
};
