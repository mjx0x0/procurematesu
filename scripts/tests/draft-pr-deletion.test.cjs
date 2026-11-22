'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('end users are offered deletion only for PRs that are still in Draft', () => {
  const page = read('app/dashboard/purchase-requests/page.tsx');
  assert.match(page, /pr\.current_stage === "draft" && \(/);
  assert.match(page, /Delete unsubmitted draft/);
  assert.match(page, /Delete Draft Purchase Request\?/);
  assert.match(page, /Admin Dashboard's active Draft PR records/);
  assert.match(page, /Physically submitted and officially registered PRs cannot be deleted by end users/);
  assert.match(page, /\/api\/pr\/delete-draft/);
});

test('draft deletion API requires an authenticated approved active end-user', () => {
  const route = read('app/api/pr/delete-draft/route.ts');
  assert.match(route, /export async function DELETE/);
  assert.match(route, /admin\.auth\.getUser\(token\)/);
  assert.match(route, /profile\.status !== 'approved'/);
  assert.match(route, /profile\.is_active !== true/);
  assert.match(route, /profile\.role === 'admin'/);
  assert.match(route, /\.eq\('user_id', user\.id\)/);
});

test('draft deletion is constrained atomically to the owner and current Draft stage', () => {
  const route = read('app/api/pr/delete-draft/route.ts');
  assert.match(route, /\.delete\(\)[\s\S]*?\.eq\('pr_no', prNo\)[\s\S]*?\.eq\('user_id', user\.id\)[\s\S]*?\.eq\('current_stage', 'draft'\)[\s\S]*?\.select\('pr_no'\)/);
  assert.match(route, /status: 409/);
  assert.match(route, /advanced beyond Draft/);
  assert.doesNotMatch(route, /\.delete\(\)[\s\S]*?\.eq\('pr_no', prNo\);/);
});
