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


test('landing page brand lockup uses a framed logo, refined gradient wordmark, and compact institutional tagline', () => {
  const landing = read('components/LandingPage.tsx');
  const branding = read('lib/system-branding.ts');

  assert.match(landing, /aria-label="ProcureMateSU/);
  assert.match(landing, /rounded-\[14px\].*border border-\[#F2D28A\]\/45/s);
  assert.ok(landing.includes('from-white via-[#FFF5E5] to-[#F1E4EF]'));
  assert.ok(landing.includes('from-[#FFF0B5] via-[#F6C453] to-[#C9871B]'));
  assert.ok(landing.includes('px-4 py-2.5 sm:gap-6 sm:px-8'));
  assert.ok(landing.includes('grid h-11 w-11 shrink-0 place-items-center'));
  assert.ok(landing.includes('<MsuLogo size={35}'));
  assert.match(landing, /Digital Procurement Logbook/);
  assert.match(branding, /SYSTEM_TAGLINE = "MSU – General Santos"/);
});

test('the public landing hero follows the requested Digital Procurement headline hierarchy', () => {
  const source = read('components/LandingPage.tsx');
  assert.match(source, /MSU – GENERAL SANTOS/);
  assert.match(source, /Digital Procurement/);
  assert.match(source, /Logbook &amp; Inquiry System/);
  assert.match(source, /SYSTEM_DESCRIPTION/);
  assert.match(source, /SYSTEM_TAGLINE/);
  assert.match(source, /MSU – GENERAL SANTOS/);
  assert.doesNotMatch(source, /MSU – GENERAL SANTOS CITY/);
  assert.doesNotMatch(source, /MSU General Santos City Digital Procurement Logbook/);
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
  assert.match(dashboard, /brandWordmark/);
  assert.match(dashboard, /workspaceLabel="End User Workspace"/);
  assert.match(admin, /brandWordmark/);
  assert.match(admin, /workspaceLabel="Administrative Workspace"/);
  assert.match(login, /Sign in to the \{SYSTEM_NAME\}/);
  assert.match(logo, /General Santos/);
  assert.doesNotMatch(logo, /General Santos City/);
});

test('main dashboard headers show the ProcureMateSU wordmark with MSU letters highlighted and role-specific workspace labels', () => {
  const header = read('components/dashboard/SystemPageHeader.tsx');
  const dashboard = read('app/dashboard/page.tsx');
  const admin = read('app/admin/page.tsx');

  assert.match(header, /brandWordmark\?: boolean/);
  assert.match(header, /aria-label=\{brandWordmark \? "ProcureMateSU"/);
  assert.ok(header.includes('rounded-[14px] border border-[#F2D28A]/45'));
  assert.ok(header.includes('from-white via-[#FFF5E5] to-[#F1E4EF]'));
  assert.ok(header.includes('from-[#FFF0B5] via-[#F6C453] to-[#C9871B]'));
  assert.ok(header.includes('bg-[#4A002A]/95'));
  assert.ok(header.includes('Digital Procurement System'));
  assert.ok(header.includes('text-[#F6D58A]'));
  assert.ok(header.includes('text-white/75'));
  assert.ok(header.includes('tracking-[0.10em]'));
  assert.ok(header.includes('rounded-full bg-[#E9B957]'));
  assert.ok(header.includes('data-workspace-brand={brandLogo && brandWordmark ? "true" : undefined}'));
  const globalStyles = read('app/globals.css');
  assert.ok(globalStyles.includes('nav[class*="sticky"][data-workspace-brand="true"]'));
  assert.ok(globalStyles.includes('background: #4A002A !important;'));
  assert.ok(globalStyles.includes('position: sticky !important;'));
  assert.ok(globalStyles.includes('top: 0 !important;'));
  assert.match(dashboard, /overflow-x-clip/);
  assert.doesNotMatch(dashboard, /overflow-x-hidden/);
  assert.match(dashboard, /workspaceLabel="End User Workspace"/);
  assert.match(admin, /workspaceLabel="Administrative Workspace"/);
  assert.match(dashboard, /brandWordmark/);
  assert.match(admin, /brandWordmark/);
});

test('the short ProcureMateSU wordmark and Gab AI assistant identity remain separate', () => {
  const landing = read('components/LandingPage.tsx');
  const login = read('components/auth/LandingLoginCard.tsx');
  assert.match(landing, /Procure/);
  assert.ok(landing.includes('>Procure</span>'));
  assert.ok(landing.includes('>M</span>'));
  assert.ok(landing.includes('>ate</span>'));
  assert.ok(landing.includes('>SU</span>'));
  assert.match(landing, /Gab AI/);
  assert.match(login, /Gab AI|SYSTEM_NAME/);
});


test('landing page sections are ordered About, How It Works, Resources, Transparency, Contact', () => {
  const source = read('components/LandingPage.tsx');

  for (const sectionId of ['how-it-works', 'resources', 'transparency', 'contact']) {
    assert.ok(source.includes('id="' + sectionId + '"'), 'missing section: ' + sectionId);
  }

  const sectionOrder = ['about', 'how-it-works', 'resources', 'transparency', 'contact']
    .map((sectionId) => source.indexOf('id="' + sectionId + '"'));
  assert.ok(sectionOrder.every((position) => position >= 0));
  assert.deepEqual(sectionOrder, [...sectionOrder].sort((a, b) => a - b));

  for (const label of [
    'Create a PR Draft',
    'Review, Print & Sign',
    'Submit the Printed Copy',
    'Office Receipt & Recording',
    'Track Your Request',
  ]) {
    assert.ok(source.includes(label), 'missing process step: ' + label);
  }

});

test('official resource links use the approved RA 12009 references and GPPB advisory', () => {
  const source = read('components/LandingPage.tsx');
  for (const url of [
    'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/97750',
    'https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf',
    'https://www.gppb.gov.ph/circulars/',
    'https://www.gppb.gov.ph/resolutions/',
  ]) {
    assert.ok(source.includes(url), 'missing official reference: ' + url);
  }
  assert.match(source, /GPPB Resolution No\. 02-2025/);
});

test('PMO contact card shows the temporary STTC location without a university directory link', () => {
  const source = read('components/LandingPage.tsx');
  assert.match(source, /Assoc\. Prof\. Nelson P\. Benares, Jr\./);
  assert.match(source, /tel:\+639088105634/);
  assert.match(source, /Science and Technology Training Center \(STTC\)/);
  assert.match(source, /Office arrangements may change/);
  assert.match(source, /contact the PMO before visiting to confirm the current location/);
  assert.doesNotMatch(source, /https:\/\/msugensan\.edu\.ph\/about\/university-directory\//);
  assert.doesNotMatch(source, /View University Directory/);
  assert.doesNotMatch(source, /Monday\s*-\s*Friday.*\d{1,2}:\d{2}/i);
});


test('the three user-identified landing-page callouts and About statistics are removed', () => {
  const source = read('components/LandingPage.tsx');

  assert.doesNotMatch(source, /value: "20"/);
  assert.doesNotMatch(source, /value: "60\+"/);
  assert.doesNotMatch(source, /label: "Workflow Tracking"/);
  assert.doesNotMatch(source, /label: "Role-Based Access"/);
  assert.doesNotMatch(source, /label: "Gab AI Policy Guide"/);
  assert.doesNotMatch(source, /Creating a digital draft does not mean the Procurement Office has officially received the request/);
  assert.doesNotMatch(source, /IRR reference reminder/);
  assert.doesNotMatch(source, /public-advisory-no-09-2026/);

  // The section headings and useful process/resource cards remain available.
  assert.match(source, /About the Digital Procurement System/);
  assert.match(source, /How It Works/);
  assert.match(source, /Submit the Printed Copy/);
  assert.match(source, /Republic Act No\. 12009/);
  assert.match(source, /Approved Implementing Rules/);
});

test('the New PR physical-submission notice now refers to the digital procurement system', () => {
  const source = read('app/dashboard/new-pr/ProcurementRequestForm.tsx');
  assert.match(source, /through this digital procurement system only records and prepares the PR digitally/);
  assert.doesNotMatch(source, /through ProcuremateSU/);
});
