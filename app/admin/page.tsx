"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isStaleRefreshTokenError } from "@/lib/supabase/client";
import { SYSTEM_NAME } from "@/lib/system-branding";
import { PROCUREMENT_STAGES } from "@/lib/procurement-process";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import AdminPRNotificationPopover from "@/components/AdminPRNotificationPopover";
import LoadingScreen from "@/components/LoadingScreen";
import { Activity, AlertCircle, ArrowRight, CalendarClock, ChevronRight, Clock3, RefreshCw, Workflow } from "lucide-react";

interface ActionCounts {
  pendingApprovals: number;
  physicalReceipt: number;
  officialNumber: number;
}
interface DashboardPR {
  pr_no: string;
  purpose: string | null;
  department: string | null;
  total: number | string | null;
  current_stage: string | null;
  created_at: string;
  updated_at: string | null;
}
interface RecentStageEvent {
  pr_no: string;
  stage_name: string | null;
  stage_key: string | null;
  completed_at: string | null;
  remarks: string | null;
  status: string | null;
}

const WORKFLOW_GROUPS = [
  { label: "Draft & receipt", keys: ["draft", "receipt_of_pr"], color: "bg-amber-500" },
  { label: "Review & validation", keys: ["ppmp_app_verification", "pmo_director_validation"], color: "bg-blue-500" },
  { label: "PR control & budget", keys: ["pr_pre_numbering", "budget_endorsement", "approved_pr_received"], color: "bg-violet-600" },
  { label: "RFQ & quotations", keys: ["rfq_generation", "rfq_evaluation", "rfq_printing", "philgeps_posting", "aoq_preparation", "aoq_evaluation", "awarded_aoq_received"], color: "bg-orange-500" },
  { label: "Purchase order & closeout", keys: ["po_generation_evaluation", "pmo_director_po_validation", "budget_po_endorsement", "approved_po_received", "po_release_supplier", "spmo_endorsement", "monitoring_documentation"], color: "bg-emerald-600" },
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

export default function AdminDashboard() {
  const router = useRouter();
  const [actionCounts, setActionCounts] = useState<ActionCounts>({ pendingApprovals: 0, physicalReceipt: 0, officialNumber: 0 });
  const [prs, setPrs] = useState<DashboardPR[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentStageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadError(null);
    const [pendingUsers, purchaseRequests, stageEvents] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "end_user").eq("status", "pending"),
      supabase.from("purchase_requests").select("pr_no,purpose,department,total,current_stage,created_at,updated_at,physical_submitted_at,physical_received_at").or("current_stage.neq.draft,physical_submitted_at.not.is.null").order("created_at", { ascending: false }),
      supabase.from("pr_stages_completed").select("pr_no,stage_name,stage_key,completed_at,remarks,status").order("completed_at", { ascending: false }).limit(8),
    ]);

    if (pendingUsers.error) console.error("Failed to load pending account approvals:", pendingUsers.error);
    if (purchaseRequests.error) {
      console.error("Failed to load admin dashboard purchase requests:", purchaseRequests.error);
      setLoadError("Procurement workflow data could not be loaded. Please refresh.");
      setPrs([]);
    } else {
      const rows = (purchaseRequests.data || []) as DashboardPR[];
      setPrs(rows);
      setActionCounts({
        pendingApprovals: pendingUsers.count || 0,
        physicalReceipt: rows.filter((pr) => pr.current_stage === "draft" && Boolean((pr as any).physical_submitted_at)).length,
        officialNumber: rows.filter((pr) => pr.current_stage === "pr_pre_numbering").length,
      });
    }
    if (stageEvents.error) {
      console.error("Failed to load recent procurement activity:", stageEvents.error);
      setRecentEvents([]);
    } else {
      const visiblePrNumbers = new Set(((purchaseRequests.data || []) as DashboardPR[]).map((pr) => pr.pr_no));
      setRecentEvents(((stageEvents.data || []) as RecentStageEvent[]).filter((event) => visiblePrNumbers.has(event.pr_no)));
    }
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
        const { data: profile } = await supabase.from("users").select("role,is_active,status").eq("id", authUser.id).single();
        if (profile?.role !== "admin" || profile?.is_active === false || (profile?.status && profile.status !== "approved")) {
          router.replace("/dashboard");
          return;
        }
        await loadSummary();
      } catch (error) {
        if (!isStaleRefreshTokenError(error)) console.error("Admin dashboard verification notice:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void verifyAdminAndLoad();
    return () => { active = false; };
  }, [router, loadSummary]);

  useEffect(() => {
    const refresh = () => { void loadSummary(); };
    window.addEventListener("admin-action-counts-refresh", refresh);
    const channel = supabase.channel("admin-dashboard-live-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pr_stages_completed" }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener("admin-action-counts-refresh", refresh);
      void supabase.removeChannel(channel);
    };
  }, [loadSummary]);

  const workflowRows = useMemo(() => {
    const grouped = WORKFLOW_GROUPS.map((group) => ({
      ...group,
      count: prs.filter((pr) => group.keys.includes(pr.current_stage as never)).length,
    }));
    const completed = prs.filter((pr) => pr.current_stage === "completed").length;
    const other = prs.filter((pr) => ["rejected", "cancelled"].includes(pr.current_stage || "")).length;
    return [...grouped, { label: "Completed", keys: [] as unknown as readonly string[], color: "bg-green-700", count: completed }, { label: "Rejected / cancelled", keys: [] as unknown as readonly string[], color: "bg-rose-500", count: other }];
  }, [prs]);

  const attentionPRs = useMemo(() => prs
    .filter((pr) => !["completed", "rejected", "cancelled"].includes(pr.current_stage || ""))
    .map((pr) => ({ ...pr, lastUpdated: pr.updated_at || pr.created_at, age: daysSince(pr.updated_at || pr.created_at) }))
    .sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime())
    .slice(0, 5), [prs]);

  const prByNumber = useMemo(() => new Map(prs.map((pr) => [pr.pr_no, pr])), [prs]);
  const totalPRs = prs.length;
  const maxWorkflowCount = Math.max(1, ...workflowRows.map((row) => row.count));

  const manualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await loadSummary(); } finally { setRefreshing(false); }
  };

  if (loading) return <LoadingScreen label="Loading admin workspace..." />;

  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800 admin-dashboard-page">
      <SystemPageHeader
        titlePrimary="ProcureMSU"
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

      <main className="mx-auto min-w-0 max-w-7xl px-3.5 py-4 sm:px-6 sm:py-7">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-[1.7rem] md:text-[1.85rem] font-semibold tracking-[-0.035em] leading-tight text-[#4D002C]">Admin Dashboard</h1>
            <p className="mt-1 text-xs text-stone-600 sm:text-sm">Manage purchase requests, staff access, and procurement inquiries from one workspace.</p>
          </div>
          <button type="button" onClick={manualRefresh} disabled={refreshing} className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60 sm:self-auto">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh overview
          </button>
        </div>

        {loadError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{loadError}</div>}

        <section aria-labelledby="admin-action-required-heading" className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.035)]">
          <div className="flex flex-col gap-1 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 id="admin-action-required-heading" className="text-base font-bold text-[#4D002C] sm:text-xl">Action Required</h2>
              <p className="mt-0.5 text-[10px] text-stone-500 sm:text-xs">Requests and registrations currently waiting for PMO attention</p>
            </div>
            <span className="text-[10px] font-semibold text-stone-400">Updates when new requests or notifications are received</span>
          </div>
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
            <Link href="/admin/users" className="group flex min-w-0 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]">
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold leading-none text-amber-800 tabular-nums">{actionCounts.pendingApprovals}</span>
                <span className="mt-1 block text-xs font-bold text-stone-800">Pending User Approvals</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-500">Registrations awaiting an administrator decision</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/admin/purchase-requests?status=draft" className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#7B0046]/15 bg-[#7B0046]/[0.035] p-3.5 transition hover:border-[#7B0046]/30 hover:bg-[#7B0046]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]">
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold leading-none text-[#7B0046] tabular-nums">{actionCounts.physicalReceipt}</span>
                <span className="mt-1 block text-xs font-bold text-stone-800">Awaiting Physical Receipt</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-500">Printed PR forms not yet confirmed by the office</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/admin/purchase-requests?status=pr_pre_numbering" className="group flex min-w-0 items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]">
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold leading-none text-indigo-700 tabular-nums">{actionCounts.officialNumber}</span>
                <span className="mt-1 block text-xs font-bold text-stone-800">Official PR Number Assignment</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-500">Step 4 requests awaiting their official control number</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
          {actionCounts.pendingApprovals + actionCounts.physicalReceipt + actionCounts.officialNumber === 0 && (
            <p className="border-t border-stone-100 px-4 py-3 text-center text-xs font-medium text-emerald-700">No items are currently waiting for these administrative actions.</p>
          )}
        </section>

        <section aria-labelledby="workflow-overview-heading" className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.035)]">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#7B0046]/[0.07] text-[#7B0046]"><Workflow className="h-4 w-4" /></span>
              <div><h2 id="workflow-overview-heading" className="text-sm font-bold text-[#4D002C] sm:text-base">Procurement Workflow Overview</h2><p className="text-[10px] text-stone-500">Current distribution of {totalPRs} purchase requests across workflow phases</p></div>
            </div>
            <div className="flex items-center gap-3"><Link href="/admin/reports" className="hidden items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-[#7B0046] sm:inline-flex">Reports &amp; Analytics</Link><Link href="/admin/purchase-requests" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7B0046] hover:underline">View logbook <ArrowRight className="h-3 w-3" /></Link></div>
          </div>
          <div className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
            {workflowRows.map((row) => (
              <div key={row.label} className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-semibold text-stone-700">{row.label}</span>
                  <span className="text-xs font-bold tabular-nums text-stone-900">{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`${row.label}: ${row.count} requests`}>
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.count / maxWorkflowCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {totalPRs === 0 && <p className="border-t border-stone-100 px-4 py-3 text-center text-xs text-stone-500">No purchase requests are available to summarize yet.</p>}
        </section>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section aria-labelledby="recent-activity-heading" className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.035)]">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Activity className="h-4 w-4" /></span><div><h2 id="recent-activity-heading" className="text-sm font-bold text-[#4D002C] sm:text-base">Recent System Activity</h2><p className="text-[10px] text-stone-500">Latest recorded procurement stage updates</p></div></div>
              <span className="text-[10px] text-stone-400">{recentEvents.length} latest records</span>
            </div>
            {recentEvents.length ? <div className="divide-y divide-stone-100">
              {recentEvents.map((event, index) => {
                const related = prByNumber.get(event.pr_no);
                return <div key={`${event.pr_no}-${event.completed_at || index}-${index}`} className="flex min-w-0 items-start gap-3 px-4 py-3 sm:px-5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7B0046]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Link href={`/admin/purchase-requests?search=${encodeURIComponent(event.pr_no)}`} className="font-mono text-[11px] font-bold text-[#7B0046] hover:underline">{event.pr_no}</Link><span className="text-[10px] text-stone-400">{formatDate(event.completed_at)}</span></div>
                    <p className="mt-0.5 break-words text-xs font-semibold text-stone-800">{event.stage_name || PROCUREMENT_STAGES.find((stage) => stage.key === event.stage_key)?.label || event.stage_key || "Procurement update"}</p>
                    {related?.department && <p className="mt-0.5 text-[10px] text-stone-500">{related.department}</p>}
                    {event.remarks && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-500">{event.remarks}</p>}
                  </div>
                </div>;
              })}
            </div> : <div className="px-5 py-9 text-center"><Activity className="mx-auto h-6 w-6 text-stone-300" /><p className="mt-2 text-xs font-semibold text-stone-600">No activity has been recorded yet.</p><p className="mt-1 text-[10px] text-stone-400">Procurement stage updates will appear here.</p></div>}
          </section>

          <section aria-labelledby="attention-heading" className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.035)]">
            <div className="flex items-center gap-2.5 border-b border-stone-200 px-4 py-3 sm:px-5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarClock className="h-4 w-4" /></span>
              <div><h2 id="attention-heading" className="text-sm font-bold text-[#4D002C] sm:text-base">Requests Requiring Attention</h2><p className="text-[10px] text-stone-500">Oldest active requests by last recorded update</p></div>
            </div>
            {attentionPRs.length ? <div className="divide-y divide-stone-100">
              {attentionPRs.map((pr) => <Link key={pr.pr_no} href={`/admin/purchase-requests?search=${encodeURIComponent(pr.pr_no)}`} className="block px-4 py-3 transition hover:bg-stone-50 sm:px-5">
                <div className="flex items-center justify-between gap-2"><span className="truncate font-mono text-[11px] font-bold text-[#7B0046]">{pr.pr_no}</span><span className="shrink-0 text-[10px] font-semibold text-stone-500">{pr.age === null ? "Age unavailable" : `${pr.age}d since update`}</span></div>
                <p className="mt-1 line-clamp-1 text-xs font-semibold text-stone-800">{pr.purpose || "No purpose recorded"}</p>
                <div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-stone-500">{pr.department || "Department not recorded"}</span><span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#7B0046]">View <ChevronRight className="h-3 w-3" /></span></div>
              </Link>)}
            </div> : <div className="px-5 py-9 text-center"><AlertCircle className="mx-auto h-6 w-6 text-emerald-600" /><p className="mt-2 text-xs font-semibold text-stone-600">No active requests require follow-up.</p></div>}
            <div className="border-t border-stone-100 px-4 py-3 sm:px-5"><Link href="/admin/purchase-requests" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7B0046] hover:underline">Open purchase request logbook <ArrowRight className="h-3 w-3" /></Link></div>
          </section>
        </div>

        <footer className="mt-8 border-t border-stone-200/80 pb-8 pt-5 text-center">
          <p className="text-xs font-medium text-stone-500">© {new Date().getFullYear()} {SYSTEM_NAME}</p>
        </footer>
      </main>
    </div>
  );
}
