import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

config({ path: '.env.local' });
config();

const cols = ['category','user_input','expected_behavior','evaluation_type','retrieved_contexts','response','reference','reference_contexts','reference_source_title','reference_source_url','citation_urls','faithfulness_notes','review_status','retrieved_sources','retrieval_status','retrieval_error','answer_type','generation_provider','generation_model','generation_fallback_reason','retrieval_query','captured_at','chat_session_id','chat_message_id'];
const csv = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

function mapRow(message) {
  const c = message?.metadata?.ragas_capture;
  if (!c || c.schema_version !== 1 || typeof c.question !== 'string') return null;
  const chunks = Array.isArray(c.retrieved_chunks) ? c.retrieved_chunks : [];
  const contexts = chunks.map((x) => x?.chunk_text).filter((x) => typeof x === 'string' && x.length);
  const urls = [...new Set(chunks.flatMap((x) => ['source_url','official_url','source_link','document_url','file_url','public_url','download_url','pdf_url','url'].map((k) => x?.metadata?.[k]).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))))];
  return {
    category: '', user_input: c.question, expected_behavior: '', evaluation_type: 'ragas',
    retrieved_contexts: JSON.stringify(contexts), response: message.content || c.response || '',
    reference: '', reference_contexts: '', reference_source_title: '', reference_source_url: '',
    citation_urls: JSON.stringify(urls), faithfulness_notes: '', review_status: 'pending_reference',
    retrieved_sources: JSON.stringify(chunks.map((x) => ({ id: x?.id, document_name: x?.document_name, document_type: x?.document_type, source_type: x?.source_type, metadata: x?.metadata || {} }))),
    retrieval_status: contexts.length ? 'captured' : 'no_context', retrieval_error: '',
    answer_type: c.answer_type || 'unknown', generation_provider: c.generation_provider || 'none',
    generation_model: c.generation_model || '', generation_fallback_reason: c.generation_fallback_reason || '',
    retrieval_query: c.retrieval_query || c.question, captured_at: c.captured_at || message.created_at || '',
    chat_session_id: message.session_id || '', chat_message_id: message.id || '',
  };
}

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (['--since', '--session-id', '--output', '--limit'].includes(argv[i])) o[argv[i].slice(2)] = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') o.help = true;
    else throw new Error('Unknown argument: ' + argv[i]);
  }
  return o;
}

async function main() {
  const o = parse(process.argv.slice(2));
  if (o.help) {
    process.stdout.write('bun run ragas:export [--since ISO_DATE] [--session-id UUID] [--limit N] [--output FILE]\nRequires Supabase URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.\n');
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  if (o.since && Number.isNaN(Date.parse(o.since))) throw new Error('--since must be a valid date.');
  if (o.limit && (!Number.isInteger(Number(o.limit)) || Number(o.limit) < 1)) throw new Error('--limit must be a positive integer.');

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const messages = [];
  for (let offset = 0; ; offset += 500) {
    let q = db.from('chat_messages').select('id,session_id,sender,content,metadata,created_at')
      .eq('sender', 'ai').order('created_at', { ascending: true }).range(offset, offset + 499);
    if (o.since) q = q.gte('created_at', new Date(o.since).toISOString());
    if (o['session-id']) q = q.eq('session_id', o['session-id']);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    messages.push(...(data || []));
    if (!data || data.length < 500) break;
  }

  let rows = messages.map(mapRow).filter(Boolean);
  if (o.limit) rows = rows.slice(-Number(o.limit));
  if (!rows.length) {
    process.stdout.write('No RAGAS captures found. Ask procurement knowledge questions through GAB AI on the end-user dashboard first.\n');
    return;
  }

  const output = resolve(o.output || ('evaluation/datasets/gab_ai_ragas_responses_' + new Date().toISOString().replace(/[:.]/g, '-') + '.csv'));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, [cols.map(csv).join(','), ...rows.map((r) => cols.map((k) => csv(r[k])).join(','))].join('\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  process.stdout.write('Exported ' + rows.length + ' rows to ' + output + '\n');
}

main().catch((e) => {
  process.stderr.write(String(e?.message || e) + '\n');
  process.exitCode = 1;
});
