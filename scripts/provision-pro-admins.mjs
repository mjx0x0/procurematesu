import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before provisioning accounts.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function countRows(table, userId) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw new Error(`Unable to check existing ${table} records for an orphaned profile: ${error.message}`);
  return count || 0;
}

async function removeUnusedOrphanProfile(email, profile) {
  if (!profile) return;
  const references = await Promise.all([
    countRows("purchase_requests", profile.id),
    countRows("chat_sessions", profile.id),
    countRows("notifications", profile.id),
    countRows("monitor_inquiries", profile.id),
  ]);
  if (references.some((count) => count > 0)) {
    throw new Error(`The existing profile for ${email} has linked records. It was not changed; review it manually before provisioning.`);
  }
  const { error } = await supabase.from("users").delete().eq("id", profile.id);
  if (error) throw new Error(`Unable to remove the unused orphan profile for ${email}: ${error.message}`);
  console.log(`Removed an unused orphan profile for ${email} so Supabase Auth can create the matching account.`);
}

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

const authUsers = await listAllAuthUsers();
const newCredentials = [];

for (let number = 1; number <= 10; number += 1) {
  const email = `procurement${number}@msugensan.edu.ph`;
  const fullName = `PRO Admin ${number}`;
  let authUser = authUsers.find((candidate) => candidate.email?.toLowerCase() === email);

  if (authUser && authUser.app_metadata?.account_type !== "procurement_personnel") {
    throw new Error(`The Auth account ${email} already exists but is not marked as a provisioned Procurement Office account. No role changes were made; review it manually.`);
  }
  const { data: profile, error: profileError } = await supabase.from("users")
    .select("id,email,full_name,role,status,is_active")
    .eq("email", email)
    .maybeSingle();
  if (profileError) throw new Error(`Unable to inspect the profile for ${email}: ${profileError.message}`);

  if (profile && (!authUser || profile.id !== authUser.id)) {
    await removeUnusedOrphanProfile(email, profile);
  }

  if (!authUser) {
    const temporaryPassword = crypto.randomBytes(24).toString("base64url");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, department: "Procurement Office" },
      app_metadata: { role: "admin", account_type: "procurement_personnel" },
    });
    if (error || !data.user) throw new Error(`Unable to create ${email}: ${error?.message || "No user returned"}`);
    authUser = data.user;
    newCredentials.push({ email, displayName: fullName, temporaryPassword });
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
      user_metadata: { ...(authUser.user_metadata || {}), full_name: fullName, department: "Procurement Office" },
      app_metadata: { ...(authUser.app_metadata || {}), role: "admin", account_type: "procurement_personnel" },
    });
    if (error || !data.user) throw new Error(`Unable to update Auth metadata for ${email}: ${error?.message || "No user returned"}`);
    authUser = data.user;
  }

  const { error: profileUpsertError } = await supabase.from("users").upsert({
    id: authUser.id,
    email,
    full_name: fullName,
    department: "Procurement Office",
    role: "admin",
    is_active: true,
    status: "approved",
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (profileUpsertError) throw new Error(`Unable to activate the profile for ${email}: ${profileUpsertError.message}`);

  console.log(`Provisioned ${fullName} (${email})`);
}

if (newCredentials.length > 0) {
  const outputPath = path.resolve("pro-admin-initial-credentials.json");
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), accounts: newCredentials }, null, 2), { mode: 0o600 });
  console.log(`One-time passwords for newly created accounts were saved to ${outputPath}. This file is git-ignored; distribute it securely and delete it after delivery.`);
} else {
  console.log("All ten Auth accounts already existed; no passwords were reset or generated.");
}

console.log("All ten PRO Admin profiles are active, approved administrators.");
