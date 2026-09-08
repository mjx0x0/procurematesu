import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { retrieveDocumentChunks } from '@/lib/document-retrieval';
import { GoogleGenAI } from '@google/genai';

const TESTS = [
  { name: 'RA 12009', question: 'What is RA 12009?', keywords: ['12009', 'procurement', 'government'] },
  { name: '20-stage workflow', question: 'What are the stages in the MSU-General Santos procurement process?', keywords: ['receipt', 'verification', 'purchase order', 'monitoring'] },
  { name: 'SVP', question: 'What is Small Value Procurement and what should I consider?', keywords: ['small value', 'procurement', 'threshold'] },
  { name: 'PR tracking', question: 'How does ProcuremateSU help users track a Purchase Request?', keywords: ['purchase request', 'status', 'stage'] },
  { name: 'Next step', question: 'What information should a user need to know about what happens next in a procurement process?', keywords: ['next', 'stage', 'process'] },
  { name: 'Grounding', question: 'Answer using the authorized procurement references available to the system, and say when the references do not support a claim.', keywords: ['authorized', 'references'] },
];

async function getAuthorizedUser(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const admin = serviceKey && url ? createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  let user = null;
  const authHeader = request.headers.get('authorization');
  if (admin && authHeader?.startsWith('Bearer ')) {
    const { data } = await admin.auth.getUser(authHeader.slice(7).trim());
    user = data.user || null;
  }
  if (!user) {
    const server = await createServerClient();
    const { data } = await server.auth.getUser();
    user = data.user || null;
  }
  if (!user) return null;
  const db = admin || await createServerClient();
  const { data: profile } = await db.from('users').select('role,is_active').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin' || profile.is_active === false) return null;
  return { user, db };
}

async function generateAnswer(question: string, context: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return '';
  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = `Answer the procurement question using the supplied authorized context. Do not invent facts. If the context is insufficient, explicitly say so.\n\nAUTHORIZED CONTEXT:\n${context || '(No retrieved context)'}\n\nQUESTION:\n${question}`;
  for (const model of ['gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
    try {
      const result = await ai.models.generateContent({ model, contents: prompt, config: { temperature: 0.1, maxOutputTokens: 900 } });
      const text = result.text?.trim();
      if (text) return text;
    } catch {}
  }
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const selected = typeof body?.testName === 'string' ? TESTS.find(t => t.name === body.testName) : null;
    const tests = selected ? [selected] : TESTS;
    const results = [];

    for (const test of tests) {
      const retrieval = await retrieveDocumentChunks(test.question, 4);
      const response = await generateAnswer(test.question, retrieval.formattedContext);
      const normalized = response.toLowerCase();
      const matched = test.keywords.filter(k => normalized.includes(k.toLowerCase()));
      const keywordCoverage = test.keywords.length ? (matched.length / test.keywords.length) * 100 : 0;
      const retrievalGrounded = retrieval.chunks.length > 0 && retrieval.formattedContext.length > 50;
      const sourcesPresent = retrieval.sources.length > 0;
      const score = Math.round((keywordCoverage * 0.55 + (retrievalGrounded ? 25 : 0) + (sourcesPresent ? 10 : 0) + (response ? 10 : 0)) * 100) / 100;
      const notes = !response ? 'No model response returned.' : !retrievalGrounded ? 'No retrieved reference context was available.' : score >= 80 ? 'Pass: response contains expected concepts and was grounded in retrieved context.' : 'Review: response needs manual verification against the source material.';
      const row = { test_name: test.name, question: test.question, response, expected_keywords: test.keywords, keyword_coverage: keywordCoverage, retrieval_grounded: retrievalGrounded, sources_present: sourcesPresent, score, notes };
      results.push({ ...row, sources: retrieval.sources, matchedKeywords: matched });
      await auth.db.from('ai_response_evaluations').insert({ evaluator_id: auth.user.id, ...row });
    }

    const average = results.length ? results.reduce((s, r) => s + Number(r.score), 0) / results.length : 0;
    return NextResponse.json({ results, averageScore: Math.round(average * 100) / 100 });
  } catch (error) {
    console.error('[ai-evaluation]', error);
    return NextResponse.json({ error: 'Unable to run AI evaluation.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthorizedUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { data, error } = await auth.db.from('ai_response_evaluations').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ evaluations: data || [] });
}
