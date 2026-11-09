"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isStaleRefreshTokenError } from "@/lib/supabase/client";
import { SYSTEM_NAME } from "@/lib/system-branding";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import AdminPRNotificationPopover from "@/components/AdminPRNotificationPopover";
import LoadingScreen from "@/components/LoadingScreen";
import { ChevronRight, UserCheck, FileText, Hash, BarChart3, ClipboardCheck } from "lucide-react";

interface ActionCounts {
  pendingApprovals: number;
  physicalReceipt: number;
  officialNumber: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [actionCounts, setActionCounts] = useState<ActionCounts>({
    pendingApprovals: 0,
    physicalReceipt: 0,
    officialNumber: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    const [pendingUsers, draftPRs, preNumberingPRs] = await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "end_user")
        .eq("status", "pending"),
      supabase
        .from("purchase_requests")
        .select("pr_no", { count: "exact", head: true })
        .eq("current_stage", "draft"),
      supabase
        .from("purchase_requests")
        .select("pr_no", { count: "exact", head: true })
        .eq("current_stage", "pr_pre_numbering"),
    ]);

    if (pendingUsers.error) console.error("Failed to load pending account approvals:", pendingUsers.error);
    if (draftPRs.error) console.error("Failed to load PRs awaiting physical receipt:", draftPRs.error);
    if (preNumberingPRs.error) console.error("Failed to load PRs awaiting official numbering:", preNumberingPRs.error);

    setActionCounts({
      pendingApprovals: pendingUsers.count || 0,
      physicalReceipt: draftPRs.count || 0,
      officialNumber: preNumberingPRs.count || 0,
    });
  }, []);

  useEffect(() => {
    let active = true;

    const verifyAdminAndLoad = async () => {
      try {
        let { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          await supabase.auth.signOut().catch(() => {});
          router.replace("/");
          return;
        }

        if (!authUser) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            await supabase.auth.signOut().catch(() => {});
            router.replace("/");
            return;
          }
          authUser = session?.user || null;
        }

        if (!authUser) {
          router.replace("/");
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("role,is_active,status")
          .eq("id", authUser.id)
          .single();

        if (
          profile?.role !== "admin" ||
          profile?.is_active === false ||
          (profile?.status && profile.status !== "approved")
        ) {
          router.replace("/dashboard");
          return;
        }

        await loadSummary();
      } catch (error) {
        if (!isStaleRefreshTokenError(error)) {
          console.error("Admin dashboard verification notice:", error);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void verifyAdminAndLoad();
    return () => {
      active = false;
    };
  }, [router, loadSummary]);

  useEffect(() => {
    const refreshActionCounts = () => {
      void loadSummary();
    };

    window.addEventListener("admin-action-counts-refresh", refreshActionCounts);
    return () => window.removeEventListener("admin-action-counts-refresh", refreshActionCounts);
  }, [loadSummary]);

  if (loading) return <LoadingScreen label="Loading admin workspace..." />;

  const mainActions = [
    {
      title: "Purchase Requests",
      description: "Review, update, and manage submitted purchase requests.",
      href: "/admin/purchase-requests",
      action: "Open logbook",
    },
    {
      title: "User Approvals",
      description: "Review account registrations and manage staff access.",
      href: "/admin/users",
      action: "Review accounts",
    },
    {
      title: "Inquiries",
      description: "Review procurement questions and Gab AI responses.",
      href: "/admin/inquiries",
      action: "View inquiries",
    },
    {
      title: "Procurement Reports & Analytics",
      description: "Review request volume, estimated values, departments, and workflow distribution.",
      href: "/admin/reports",
      action: "Open reports",
    },
  ];



  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800 admin-dashboard-page">
      <SystemPageHeader
        titlePrimary="ProcureMateSU"
        titleAccent=""
        compactOnMobile
        workspaceLabel="Administrative Workspace"
        brandLogo
        brandWordmark
        backHref={null}
        roleLabel="Administrator"
        containerClassName="max-w-7xl px-3.5 sm:px-6"
        showControlsDivider
      >
        <AdminPRNotificationPopover />
      </SystemPageHeader>

      <main className="max-w-7xl mx-auto min-w-0 px-3.5 sm:px-6 py-4 sm:py-7">
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#4D002C]">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Manage purchase requests, staff access, and procurement inquiries from one workspace.
          </p>
        </div>

        <nav
          aria-label="Admin main menu"
          className="mb-5 sm:mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"
        >
          {mainActions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[124px] flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_5px_20px_rgba(45,20,10,0.035)] transition-all hover:-translate-y-0.5 hover:border-[#7B0046]/30 hover:shadow-[0_8px_24px_rgba(77,0,44,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046] focus-visible:ring-offset-2 sm:p-5"
            >
              <h2 className="text-base sm:text-lg font-bold text-[#4D002C]">{item.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{item.description}</p>
              <span className="mt-auto flex items-center justify-between border-t border-stone-100 pt-3 text-xs font-bold text-[#7B0046]">
                {item.action}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </nav>

        <section
          aria-labelledby="admin-action-required-heading"
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.035)]"
        >
          <div className="flex flex-col gap-1 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 id="admin-action-required-heading" className="text-base sm:text-xl font-bold text-[#4D002C]">
                Action Required
              </h2>
              <p className="mt-0.5 text-[10px] sm:text-xs text-stone-500">
                Requests and registrations currently waiting for PMO attention
              </p>
            </div>
            <span className="text-[10px] font-semibold text-stone-400">
              Updates when a new admin notification is received
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
            <Link
              href="/admin/users"
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <UserCheck className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold leading-none text-amber-800 tabular-nums">{actionCounts.pendingApprovals}</span>
                <span className="mt-1 block text-xs font-bold text-stone-800">Pending User Approvals</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-500">Registrations awaiting an administrator decision</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/admin/purchase-requests?status=draft"
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#7B0046]/15 bg-[#7B0046]/[0.035] p-3.5 transition hover:border-[#7B0046]/30 hover:bg-[#7B0046]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7B0046]/10 text-[#7B0046]">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold leading-none text-[#7B0046] tabular-nums">{actionCounts.physicalReceipt}</span>
                <span className="mt-1 block text-xs font-bold text-stone-800">Awaiting Physical Receipt</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-500">Printed PR forms not yet confirmed by the office</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/admin/purchase-requests?status=pr_pre_numbering"
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Hash className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold leading-none text-indigo-700 tabular-nums">{actionCounts.officialNumber}</span>
                <span className="mt-1 block text-xs font-bold text-stone-800">Official PR Number Assignment</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-500">Step 4 requests awaiting their official control number</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          {actionCounts.pendingApprovals + actionCounts.physicalReceipt + actionCounts.officialNumber === 0 && (
            <p className="border-t border-stone-100 px-4 py-3 text-center text-xs font-medium text-emerald-700">
              No items are currently waiting for these administrative actions.
            </p>
          )}
        </section>

        <footer className="mt-10 border-t border-stone-200/80 pt-5 pb-8 text-center">
          <p className="text-xs font-medium text-stone-500">
            © {new Date().getFullYear()} {SYSTEM_NAME}
          </p>
        </footer>
      </main>
    </div>
  );
}
