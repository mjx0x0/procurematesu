'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const SYSTEM_NAME = 'MSU - General Santos Digital Procurement Logbook and Inquiry System';

test('the shared branding constant contains the exact official system name', () => {
  const source = read('lib/system-branding.ts');
  assert.ok(source.includes('export const SYSTEM_NAME = "' + SYSTEM_NAME + '";'));
  assert.ok(source.includes('export const SYSTEM_SHORT_NAME = "ProcureMateSU";'));
});

test('the public landing hero follows the requested Digital Procurement headline hierarchy', () => {
  const source = read('components/LandingPage.tsx');
  assert.match(source, /MSU – GENERAL SANTOS CITY/);
  assert.match(source, /Digital Procurement/);
  assert.match(source, /Logbook &amp; Inquiry System/);
  assert.match(source, /SYSTEM_DESCRIPTION/);
  assert.match(source, /SYSTEM_TAGLINE/);
  assert.match(source, /SYSTEM_NAME/);
});

test('browser and social metadata use the exact official system name', () => {
  const source = read('app/layout.tsx');
  assert.match(source, /default:\s*SYSTEM_NAME/);
  assert.match(source, /template:.*SYSTEM_NAME/);
  assert.match(source, /openGraph:\s*\{[\s\S]*title:\s*SYSTEM_NAME/);
  assert.match(source, /siteName:\s*SYSTEM_NAME/);
  assert.match(source, /twitter:\s*\{[\s\S]*title:\s*SYSTEM_NAME/);
  assert.equal(JSON.parse(read('metadata.json')).name, SYSTEM_NAME);
});

test('legacy institutional branding labels resolve to the official name', () => {
  const source = read('components/SystemBranding.tsx');
  assert.match(source, /import \{ SYSTEM_NAME \}/);
  for (const legacy of [
    'ProcuremateSU',
    'Procuremate SU',
    'MSU Gensan Procurement System',
    'MSU GenSan Procurement Management System',
  ]) {
    assert.ok(source.includes('"' + legacy + '": SYSTEM_NAME'), legacy);
  }
});

test('sign-in, registration, logo accessibility, loading and workspace labels are branded consistently', () => {
  const login = read('components/auth/LandingLoginCard.tsx');
  const signup = read('app/auth/signup/page.tsx');
  const logo = read('components/msu-logo.tsx');
  const dashboard = read('app/dashboard/page.tsx');
  const admin = read('app/admin/page.tsx');
  const purchaseRequests = read('app/dashboard/purchase-requests/page.tsx');
  const chatbot = read('app/dashboard/chatbot/page.tsx');
  const loading = read('app/loading.tsx');

  for (const source of [login, signup, logo, dashboard, admin, purchaseRequests, chatbot, loading]) {
    assert.match(source, /SYSTEM_NAME/);
  }
  assert.match(dashboard, /titleAccent="Logbook & Inquiry System"/);
  assert.match(admin, /titleAccent="Logbook & Inquiry System"/);
  assert.match(login, /Sign in to the \{SYSTEM_NAME\}/);
});

test('the short ProcureMateSU wordmark and Gab AI assistant identity remain separate', () => {
  const landing = read('components/LandingPage.tsx');
  const login = read('components/auth/LandingLoginCard.tsx');
  assert.match(landing, /Procure/);
  assert.match(landing, /Mate/);
  assert.match(landing, /Gab AI/);
  assert.match(login, /Gab AI|SYSTEM_NAME/);
});

test('the New PR physical-submission notice now refers to the digital procurement system', () => {
  const source = read('app/dashboard/new-pr/ProcurementRequestForm.tsx');
  assert.match(source, /through this digital procurement system only records and prepares the PR digitally/);
  assert.doesNotMatch(source, /through ProcuremateSU/);
});
