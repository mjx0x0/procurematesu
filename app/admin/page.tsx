"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isStaleRefreshTokenError } from "@/lib/supabase/client";
import { SYSTEM_NAME } from "@/lib/system-branding";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import AdminPRNotificationPopover from "@/components/AdminPRNotificationPopover";
import LoadingScreen from "@/components/LoadingScreen";
import { CheckCircle, Clock, FileCheck, XCircle, ChevronRight } from "lucide-react";

interface PRSummary {
  current_stage: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [prs, setPrs] = useState<PRSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select("current_stage")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load PR overview:", error);
      return;
    }

    setPrs((data || []) as PRSummary[]);
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
    const channel = supabase
      .channel("admin-dashboard-pr-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_requests" },
        () => {
          void loadSummary();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSummary]);

  const stats = useMemo(() => ({
    total: prs.length,
    pending: prs.filter((pr) => !["completed", "rejected", "cancelled"].includes(pr.current_stage)).length,
    completed: prs.filter((pr) => pr.current_stage === "completed").length,
    rejected: prs.filter((pr) => ["rejected", "cancelled"].includes(pr.current_stage)).length,
  }), [prs]);

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
  ];

  const summaryItems = [
    { label: "Total PRs", value: stats.total, color: "text-[#7B0046]", Icon: FileCheck },
    { label: "In Progress", value: stats.pending, color: "text-amber-600", Icon: Clock },
    { label: "Completed", value: stats.completed, color: "text-emerald-700", Icon: CheckCircle },
    { label: "Rejected", value: stats.rejected, color: "text-red-600", Icon: XCircle },
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
          className="mb-5 sm:mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
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
          aria-labelledby="admin-pr-overview-heading"
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.035)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-6">
            <h2 id="admin-pr-overview-heading" className="text-base sm:text-xl font-bold text-[#4D002C]">
              PR Overview
            </h2>
            <p className="text-[10px] sm:text-xs text-stone-500 text-right">
              Requisition status &amp; processing pipeline
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-stone-100 p-1.5 sm:p-2 md:grid-cols-4">
            {summaryItems.map(({ label, value, color, Icon }) => (
              <div key={label} className="flex min-h-[82px] items-center justify-between gap-2 bg-white p-3 sm:p-4">
                <div className="min-w-0">
                  <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
                  <div className="mt-1 text-[11px] sm:text-xs font-semibold text-stone-700">{label}</div>
                </div>
                <Icon className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${color}`} />
              </div>
            ))}
          </div>
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
