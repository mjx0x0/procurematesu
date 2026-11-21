'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('database migration removes direct account, PR and PR-item write paths for API clients', () => {
  const sql = read('supabase/migrations/20261103061832_harden_pr_workflows_and_user_permissions.sql');
  assert.match(sql, /REVOKE INSERT, UPDATE ON TABLE public\.users FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /REVOKE INSERT, UPDATE ON TABLE public\.purchase_requests FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /REVOKE INSERT, UPDATE ON TABLE public\.pr_items FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /DROP POLICY IF EXISTS "Users can insert own active PRs"/i);
  assert.match(sql, /status = 'approved'/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_purchase_request_with_items[\s\S]*TO service_role/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.process_purchase_request_action[\s\S]*TO service_role/i);
});

test('transactional PR creation recalculates totals and writes parent, children and initial history atomically', () => {
  const sql = read('supabase/migrations/20261103061832_harden_pr_workflows_and_user_permissions.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_purchase_request_with_items/i);
  assert.match(sql, /sum\(\(item->>'quantity'\)::numeric \* \(item->>'unit_cost'\)::numeric\)/i);
  assert.match(sql, /INSERT INTO public\.purchase_requests/i);
  assert.match(sql, /INSERT INTO public\.pr_items/i);
  assert.match(sql, /INSERT INTO public\.pr_stages_completed/i);
});

test('stage action is transactional, cascades PR renumbering and supports final completion', () => {
  const sql = read('supabase/migrations/20261103061832_harden_pr_workflows_and_user_permissions.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.process_purchase_request_action/i);
  assert.match(sql, /SET pr_no = v_official_pr_no/i);
  assert.match(sql, /v_pr\.current_stage = 'monitoring_documentation' AND p_new_stage = 'completed'/i);
});

test('PR creation requires an approved active profile and derives item subtotals on the server', () => {
  const route = read('app/api/pr/create/route.ts');
  assert.match(route, /profile\.status !== 'approved'/);
  assert.match(route, /profile\.is_active !== true/);
  assert.match(route, /Number\.isSafeInteger\(quantity\)/);
  assert.match(route, /total_cost: totalCost/);
  assert.match(route, /admin\.rpc\('create_purchase_request_with_items'/);
  assert.doesNotMatch(route, /Number\(item\.total_cost\)/);
});

test('final Monitoring and Documentation stage can be completed through the admin workflow', () => {
  const ui = read('app/admin/purchase-requests/page.tsx');
  const api = read('app/api/admin/complete-stage/route.ts');
  assert.match(ui, /isFinalWorkflowStage/);
  assert.match(ui, /isFinalWorkflowStage \? "completed"/);
  assert.match(api, /\[\.\.\.PROCUREMENT_STAGE_KEYS, 'completed'\]/);
  assert.match(api, /process_purchase_request_action/);
});

test('generic legacy IRR source is classified as historical and retrieved for explicit history questions', () => {
  const retrieval = read('lib/document-retrieval.ts');
  assert.match(retrieval, /\^irr\(\?:\\s\|\$\)/);
  assert.match(retrieval, /'IRR 2016', 'IRR'/);
  assert.match(retrieval, /\.eq\('document_name', 'IRR'\)/);
});


test('SVP Abstract questions source-scope and prioritize IRR Section 34.3(f) excerpts', () => {
  const retrieval = read('lib/document-retrieval.ts');
  assert.match(retrieval, /asksSvpAbstractOfQuotations/);
  assert.match(retrieval, /scopedPhraseSearch\(currentIrr, '34\.3\(f\)'\)/);
  assert.match(retrieval, /scopedPhraseSearch\(currentIrr, 'Abstract of Quotations'\)/);
  assert.match(retrieval, /scopedPhraseSearch\(currentIrr, 'Quotations or Ratings'\)/);
  assert.match(retrieval, /score \+= 1000/);
  assert.match(retrieval, /asksSvpAbstractOfQuotations \|\| asksCurrentLawStatus/);

  const guards = read('lib/procurement-answer-guards.js');
  assert.match(guards, /function isCurrentApprovedIrrChunk/);
  assert.match(guards, /sourceUrl === CURRENT_IRR_URL/);
  assert.match(guards, /function hasVerifiedSvpAbstractEvidence/);
  assert.match(guards, /function answerSvpAbstractOfQuotations/);
  assert.match(guards, /\]\.join\('\\\\n'\)/);
});

test('Gab AI runtime retrieval generates 384-dimensional query embeddings and calls vector RPC with keyword fallback', () => {
  const retrieval = read('lib/document-retrieval.ts');
  assert.match(retrieval, /Xenova\/all-MiniLM-L6-v2/);
  assert.match(retrieval, /vector\.length !== 384/);
  assert.match(retrieval, /supabase\.rpc\('match_documents'/);
  assert.match(retrieval, /source_type: 'supabase_vector'/);
  assert.match(retrieval, /Vector search unavailable; using keyword retrieval/);
});

test('vector RPC returns provenance fields required by Gab AI citations', () => {
  const sql = read('supabase/migrations/20261121090000_add_gab_ai_vector_retrieval.sql');
  assert.match(sql, /extensions\.vector\(384\)/);
  assert.match(sql, /document_name text/);
  assert.match(sql, /document_type text/);
  assert.match(sql, /metadata jsonb/);
  assert.match(sql, /1 - \(dc\.embedding <=> query_embedding\) as similarity/);
});
