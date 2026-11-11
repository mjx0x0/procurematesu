'use strict';

const EMPTY_ASSISTANT_RESPONSE =
  "I’m sorry, I couldn’t produce a complete response just now. Please try sending your procurement question again. I won’t guess at procurement requirements or MSU-specific details.";

function parseTableCells(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.includes('|')) return null;
  return trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function isTableSeparator(line) {
  const cells = parseTableCells(line);
  return Boolean(cells && cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function cleanHtmlArtifacts(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:div|p|ul|ol|li|table|thead|tbody|tr|th|td|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function convertMarkdownTables(value) {
  const lines = value.split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headerCells = parseTableCells(lines[index]);
    if (!headerCells || !isTableSeparator(lines[index + 1])) {
      output.push(lines[index]);
      continue;
    }

    index += 2;
    const rows = [];
    while (index < lines.length && lines[index].trim().includes('|')) {
      const cells = parseTableCells(lines[index]);
      if (!cells) break;
      rows.push(cells);
      index += 1;
    }
    index -= 1;

    if (!rows.length) {
      output.push(headerCells.join(' — '));
      continue;
    }

    for (const cells of rows) {
      const fields = cells.map((cell, cellIndex) => {
        const label = headerCells[cellIndex];
        return label ? label + ': ' + cell : cell;
      }).filter(Boolean);
      output.push('• ' + fields.join(' | '));
    }
  }

  return output.join('\n');
}

function moveSourceCitationsToEnd(value) {
  const citations = [];
  let body = String(value || '');

  const citationPatterns = [
    /【\s*Source\s*:\s*([^】]+)】/giu,
    /\[\s*Source\s*:\s*([^\]]+)\]/giu,
  ];

  for (const pattern of citationPatterns) {
    body = body.replace(pattern, (_match, citation) => {
      const label = String(citation || '').replace(/\s+/g, ' ').trim();
      if (label) citations.push(label);
      return '';
    });
  }

  const uniqueCitations = Array.from(new Map(
    citations.map((citation) => [citation.toLocaleLowerCase(), citation])
  ).values());

  if (!uniqueCitations.length) return body;

  body = body
    .replace(/^[ \t]*[•●▪][ \t]*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const references = ['**References**', ...uniqueCitations.map((citation) => '- ' + citation)].join('\n');
  return body ? body + '\n\n' + references : references;
}

function normalizeAssistantResponse(value) {
  if (typeof value !== 'string') return EMPTY_ASSISTANT_RESPONSE;

  const cleaned = convertMarkdownTables(moveSourceCitationsToEnd(cleanHtmlArtifacts(value)))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned || !/[\p{L}\p{N}]/u.test(cleaned.replace(/<[^>]*>/g, ''))) {
    return EMPTY_ASSISTANT_RESPONSE;
  }

  return cleaned;
}

function normalizeInlineMarkdown(value) {
  const text = String(value || '');
  const label = text.match(/^(\s*)\*\*([^*\n]{1,70}:)\*\*(.*)$/s);

  if (label) {
    const tail = stripEmphasisMarkers(label[3]);
    return label[1] + '**' + label[2] + '**' + tail;
  }

  return stripEmphasisMarkers(text);
}

function stripEmphasisMarkers(value) {
  return String(value || '')
    .replace(/\\([*_])/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/~~/g, '')
    .replace(/(?<!\\)\*(?!\*)/g, '')
    .replace(/(?<!\\)_(?!_)/g, '')
    .split(String.fromCharCode(96)).join('');
}

module.exports = {
  EMPTY_ASSISTANT_RESPONSE,
  normalizeAssistantResponse,
  normalizeInlineMarkdown,
  moveSourceCitationsToEnd,
};
