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
  const header = landing.slice(landing.indexOf("<header"), landing.indexOf("</header>"));
  assert.match(header, /Procurement Office/);
  const visibleHeader = header.replace(/aria-label="[^"]*"/g, "");
  assert.doesNotMatch(visibleHeader, /Digital Procurement Logbook/);
  assert.match(branding, /SYSTEM_TAGLINE = "MSU – General Santos"/);
});

test('the public landing hero follows the requested Digital Procurement headline hierarchy', () => {
  const source = read('components/LandingPage.tsx');
  const hero = source.slice(source.indexOf("{/* Hero Section */}"), source.indexOf("{/* About"));
  assert.doesNotMatch(hero, /MSU – GENERAL SANTOS/);
  assert.match(source, /Digital Procurement/);
  assert.match(source, /Logbook &amp; Inquiry System/);
  assert.match(source, /SYSTEM_DESCRIPTION/);
  assert.match(source, /SYSTEM_TAGLINE/);
  assert.doesNotMatch(source, /MSU – GENERAL SANTOS CITY/);
  assert.doesNotMatch(source, /MSU General Santos City Digital Procurement Logbook/);
  assert.match(source, /SYSTEM_NAME/);
});

test('landing footer heading omits the repeated university prefix while retaining the official copyright name', () => {
  const source = read('components/LandingPage.tsx');
  const footer = source.slice(source.indexOf('{/* Footer */}'));
  assert.ok(footer.includes('<h2 className="mt-1 max-w-xl text-xl font-extrabold tracking-tight">Digital Procurement Logbook and Inquiry System</h2>'));
  assert.ok(footer.includes('© {new Date().getFullYear()} {SYSTEM_NAME}'));
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
  assert.ok(header.includes('<MsuLogo size={38} className="shrink-0" />'));
  assert.ok(!header.includes('rounded-[14px] border border-[#F2D28A]/45'));
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
  assert.ok(globalStyles.includes('border-top: 0 !important;'));
  assert.ok(globalStyles.includes('position: sticky !important;'));
  const notifications = read('components/NotificationPopover.tsx');
  assert.match(notifications, /variant = "default"/);
  assert.ok(notifications.includes('bg-white/[0.09] text-white/90'));
  assert.ok(notifications.includes('bg-[#F6C453] text-[#4A002A]'));
  assert.ok(notifications.includes('ring-[#4A002A]'));
  assert.ok(header.includes('border-white/20 bg-white/[0.09] text-white/95'));
  assert.ok(header.includes('bg-[#F6D58A]/15 text-[#F6D58A]'));
  assert.ok(dashboard.includes('<NotificationPopover variant="workspace" />'));
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

test('PMO contact card uses matching text links and omits crossed-out decorative labels', () => {
  const source = read('components/LandingPage.tsx');
  const contact = source.slice(source.indexOf('{/* Contact & Support */}'), source.indexOf('{/* Footer */}'));
  assert.match(contact, /href="tel:\+639088105634"/);
  assert.match(contact, /href="mailto:procurement@msugensan\.edu\.ph"/);
  assert.match(contact, /\+63 908 810 5634/);
  assert.match(contact, /procurement@msugensan\.edu\.ph/);
  assert.doesNotMatch(contact, /Procurement Management Office<\/p>/);
  assert.doesNotMatch(contact, /Office Information<\/p>/);
  assert.doesNotMatch(contact, /<MapPin/);
  const matchingLinkClass = 'className="inline-flex items-center gap-2 text-sm font-semibold text-[#4D002C] transition-colors hover:text-[#7B0046] hover:underline"';
  assert.equal(contact.split(matchingLinkClass).length - 1, 2);
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

test('dashboard actions and directories avoid unnecessary decorative controls', () => {
  const admin = read('app/admin/page.tsx');
  const adminPurchaseRequests = read('app/admin/purchase-requests/page.tsx');
  const dashboard = read('app/dashboard/page.tsx');
  const purchaseRequests = read('app/dashboard/purchase-requests/page.tsx');
  const transparency = read('app/dashboard/transparency/page.tsx');

  // The existing manual refresh action stays with the dedicated PR logbook filters.
  assert.match(adminPurchaseRequests, /aria-label=\{refreshing \? "Refreshing…" : "Refresh purchase requests"\}/);
  assert.doesNotMatch(adminPurchaseRequests, /\{filtered\.length\} \{filtered\.length === 1 \? "Record" : "Records"\}/);
  assert.doesNotMatch(admin, /Refresh purchase requests/);
  assert.doesNotMatch(admin, /Search by PR number, purpose, or requesting department/);

  // PR Overview keeps its values and labels but no longer renders the four decorative metric pictograms.
  const overview = dashboard.slice(dashboard.indexOf('{/* PR Overview */}'), dashboard.indexOf('{/* Recent PR Activity */}'));
  assert.doesNotMatch(overview, /<FileText|<Clock|<CheckCircle2|<AlertCircle/);

  // The public project rows retain category text badges without category pictograms.
  const projectDirectory = transparency.slice(
    transparency.indexOf('{/* Directory Listing Container */}'),
    transparency.indexOf('{/* Transparency Notice Banner */}')
  );
  assert.doesNotMatch(projectDirectory, /categoryIcon|IconComponent|<Building2|<Cpu|<Layers/);

  // Track actions use the brighter maroon consistently in both user-facing locations.
  assert.match(dashboard, /bg-\[#7B0046\].*hover:bg-\[#65003A\]/);
  assert.match(purchaseRequests, /bg-\[#7B0046\].*hover:bg-\[#65003A\]/);
});

test('admin dashboard contains only the three main actions and PR overview', () => {
  const admin = read('app/admin/page.tsx');

  assert.match(admin, /<nav[\s\S]*aria-label="Admin main menu"/);
  assert.match(admin, /href={item\.href}/);
  assert.match(admin, /href: "\/admin\/purchase-requests"/);
  assert.match(admin, /href: "\/admin\/users"/);
  assert.match(admin, /href: "\/admin\/inquiries"/);
  assert.match(admin, /PR Overview/);
  assert.match(admin, /Total PRs/);
  assert.match(admin, /In Progress/);
  assert.match(admin, /Completed/);
  assert.match(admin, /Rejected/);

  // The dashboard no longer embeds the logbook table, search, filters, or workflow actions.
  assert.doesNotMatch(admin, /Search by PR number|Current Status|Complete Stage|Confirm Receipt of Printed PR/);
  assert.doesNotMatch(admin, /<table|filtered\.map/);
});

test('admin Purchase Requests has its own route and retains the existing logbook workflows', () => {
  const purchaseRequests = read('app/admin/purchase-requests/page.tsx');
  const userApprovals = read('app/admin/users/page.tsx');
  const inquiries = read('app/admin/inquiries/page.tsx');

  assert.match(purchaseRequests, /export default function AdminPurchaseRequestsPage/);
  assert.match(purchaseRequests, /backHref="\/admin"/);
  assert.match(purchaseRequests, /<SystemPageHeader/);
  assert.match(purchaseRequests, /Search by PR number, purpose, or requesting department/);
  assert.match(purchaseRequests, /All Statuses/);
  assert.match(purchaseRequests, /All Departments/);
  assert.match(purchaseRequests, /Refresh purchase requests/);
  assert.match(purchaseRequests, /\/api\/admin\/complete-stage/);
  assert.match(purchaseRequests, /\/api\/admin\/assign-official-pr/);
  assert.match(purchaseRequests, /Confirm Receipt of Printed PR/);
  assert.match(purchaseRequests, /Permanently delete/);

  // Existing administrator destinations remain separate pages.
  assert.match(userApprovals, /export default function AdminUsersPage/);
  assert.match(inquiries, /export default function InquiriesPage/);
});


test('admin dashboard exposes a live, admin-authorized notification control for new Purchase Requests', () => {
  const admin = read('app/admin/page.tsx');
  const notifications = read('components/AdminPRNotificationPopover.tsx');

  assert.match(admin, /<AdminPRNotificationPopover \/>/);
  assert.ok(notifications.includes('event: "INSERT", schema: "public", table: "purchase_requests"'));
  assert.ok(notifications.includes('profile?.role !== "admin"'));
  assert.ok(notifications.includes('profile?.status !== "approved"'));
  assert.ok(notifications.includes('profile?.is_active !== true'));
  assert.match(notifications, /New PR Notifications/);
  assert.match(notifications, /New Purchase Request received/);
  assert.match(notifications, /Open Purchase Requests/);
});

test('admin full PR modal keeps vertical scrolling and exposes a touch-friendly horizontal form viewport', () => {
  const modal = read('components/AdminPRFullFormModal.tsx');

  assert.ok(modal.includes('overflow-y-auto overflow-x-hidden overscroll-y-contain'));
  assert.ok(modal.includes('role="region" aria-label="Scrollable official Purchase Request form"'));
  assert.ok(modal.includes('overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x'));
  assert.ok(modal.includes('min-w-[700px]'));
  assert.match(modal, /Swipe left or right to view the complete form/);
});

test('admin notification bell is separated from the account control and has no live-status dot', () => {
  const admin = read('app/admin/page.tsx');
  const header = read('components/dashboard/SystemPageHeader.tsx');
  const notifications = read('components/AdminPRNotificationPopover.tsx');

  assert.match(admin, /showControlsDivider/);
  assert.match(header, /showControlsDivider\?: boolean/);
  assert.match(header, /role="separator"/);
  assert.match(header, /aria-orientation="vertical"/);
  assert.match(header, /bg-white\/25/);
  assert.doesNotMatch(notifications, /bg-emerald-400/);
});
