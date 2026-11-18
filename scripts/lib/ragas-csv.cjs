'use strict';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((cell) => cell.length)) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Invalid CSV: unterminated quoted field.');
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some((cell) => cell.length)) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error('Invalid CSV: every column must have a header.');
  if (new Set(headers).size !== headers.length) throw new Error('Invalid CSV: duplicate column headers.');
  return rows.slice(1).map((values, index) => {
    if (values.length > headers.length) throw new Error(`Invalid CSV: row ${index + 2} has more values than the header.`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
  });
}

function serializeCsv(rows, headers) {
  const quote = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(quote).join(','), ...rows.map((row) => headers.map((header) => quote(row[header])).join(','))].join('\r\n') + '\r\n';
}

module.exports = { parseCsv, serializeCsv };
