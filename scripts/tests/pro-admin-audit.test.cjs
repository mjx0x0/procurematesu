const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("PR stage API derives actor identity from the authenticated session", () => {
  const route = read("app/api/admin/complete-stage/route.ts");
  assert.match(route, /authClient\.auth\.getUser\(\)/);
  assert.match(route, /p_actor_id:\s*user\.id/);
  assert.doesNotMatch(route, /body\??\.updatedBy|body\??\.personnelName/);
});

test("database audit function validates an active administrator and snapshots the name", () => {
  const migration = read("supabase/migrations/20261128170000_add_procurement_stage_actor_audit.sql");
  assert.match(migration, /updated_by uuid REFERENCES public\.users\(id\) ON DELETE SET NULL/);
  assert.match(migration, /updated_by_name text/);
  assert.match(migration, /role = 'admin'[\s\S]*status = 'approved'[\s\S]*is_active = true/);
  assert.equal((migration.match(/p_actor_id,\s*v_actor_name/g) || []).length, 4);
  assert.match(migration, /updated_by, updated_by_name/);
});

test("both administrator and end-user PR timelines display recorded personnel attribution", () => {
  const adminPage = read("app/admin/purchase-requests/page.tsx");
  const userPage = read("app/dashboard/pr/[pr_no]/page.tsx");
  assert.match(adminPage, /Updated by:\s*\{h\.updated_by_name\}/);
  assert.match(userPage, /Updated by:\s*\{event\.updated_by_name\}/);
  assert.match(userPage, /Updated by:\s*\{remark\.updated_by_name\}/);
});

test("provisioning script creates the ten predefined PRO Admin identities without resetting existing passwords", () => {
  const script = read("scripts/provision-pro-admins.mjs");
  assert.match(script, /number <= 10/);
  assert.ok(script.includes("`procurement${number}@msugensan.edu.ph`"));
  assert.ok(script.includes("`PRO Admin ${number}`"));
  assert.match(script, /crypto\.randomBytes\(24\)/);
  assert.match(script, /auth\.admin\.createUser/);
  assert.match(script, /auth\.admin\.updateUserById/);
  assert.doesNotMatch(script, /updateUserById\([\s\S]{0,300}password:/);
});
