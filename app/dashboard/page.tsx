"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  PlusCircle,
  Printer,
} from "lucide-react";

import { Chatbot } from "@/components/chatbot/Chatbot";
import { NotificationPopover } from "@/components/NotificationPopover";

import { supabase } from "@/lib/supabase/client";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import { MsuLogo } from "@/components/msu-logo";
import { SYSTEM_NAME } from "@/lib/system-branding";
import {
  PROCUREMENT_STAGES,
  PROCUREMENT_STAGE_LABELS,
  PROCUREMENT_STAGE_SHORT_LABELS,
} from "@/lib/procurement-process";

interface PurchaseRequest {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  created_at: string;
  department: string;
}

const TERMINAL_STAGES = ["completed", "cancelled", "rejected"];

const stageNumber = (status: string) =>
  PROCUREMENT_STAGES.find((stage) => stage.key === status)?.number;

const isApprovedStage = (status: string) => {
  const num = stageNumber(status);
  return num !== undefined && num >= 4;
};

const statusColor = (status: string) => {
  if (status === "draft") return "border-stone-200 bg-stone-100 text-stone-700";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "rejected" || status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  if (isApprovedStage(status)) return "border-[#7B0046]/20 bg-[#7B0046]/5 text-[#7B0046]";
  return "border-amber-200 bg-amber-50 text-amber-800";
};

const statusLabel = (status: string) => {
  if (status === "completed") return "Completed";
  if (status === "rejected") return "Rejected";
  if (status === "cancelled") return "Cancelled";
  return PROCUREMENT_STAGE_SHORT_LABELS[status] || PROCUREMENT_STAGE_LABELS[status] || status.replace(/_/g, " ");
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
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
        if (cancelled) return;
        setUser(authUser);

        const [{ data: profile }, { data: prData }] = await Promise.all([
          supabase.from("users").select("role").eq("id", authUser.id).maybeSingle(),
          supabase.from("purchase_requests").select("pr_no,purpose,total,current_stage,created_at,department").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(20),
        ]);

        if (cancelled) return;
        const role = profile?.role || "end_user";
        if (role === "admin") {
          router.replace("/admin");
          return;
        }
        setIsAdmin(false);
        const list = (prData || []) as PurchaseRequest[];
        setPrs(list);
        setStats({
          total: list.length,
          pending: list.filter((pr) => !TERMINAL_STAGES.includes(pr.current_stage)).length,
          completed: list.filter((pr) => pr.current_stage === "completed").length,
        });
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, [router]);

  const displayName = user?.user_metadata?.full_name || "Requisitioner";
  const initials = displayName.slice(0, 2).toUpperCase();
  const pendingDraftsCount = prs.filter((pr) => pr.current_stage === "draft").length;

  if (loading) {
    return (
      <div className="app-theme flex min-h-[100svh] items-center justify-center bg-[#F7F5F2] px-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#7B0046]" />
          <span className="text-center text-[9px] font-semibold uppercase tracking-[.16em] text-stone-400">Preparing your workspace</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-theme min-h-[100svh] overflow-x-hidden bg-[#F7F5F2] text-[#302725] dashboard-page">
      <SystemPageHeader
        titlePrimary="ProcureMateSU"
        titleAccent=""
        workspaceLabel="End User Workspace"
        brandLogo
        brandWordmark
        backHref={null}
        roleLabel={isAdmin ? "Administrator" : "Requisitioner"}
        showAdminPortal={isAdmin}
        containerClassName="max-w-[1220px] px-3.5 sm:px-7 lg:px-8"
      >
        <NotificationPopover />
        <div className="hidden h-7 w-px bg-stone-200 sm:block" />
      </SystemPageHeader>

      <main className="mx-auto w-full max-w-[1220px] px-3.5 py-4 sm:px-7 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#480028] via-[#5F0035] to-[#35001D] px-5 py-4 sm:px-7 sm:py-5 md:px-8 md:py-5 text-white shadow-[0_12px_30px_rgba(74,0,42,0.12)]">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#D4AF37]/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-20 h-72 w-72 rounded-full bg-[#7B0046]/40 blur-3xl" />
          <div className="pointer-events-none absolute right-4 -bottom-10 opacity-[0.05] select-none hidden lg:block">
            <MsuLogo size={180} />
          </div>
          <div className="relative z-10 w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              Good day, <span className="text-white">{displayName}</span>.
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-stone-200/90 font-normal w-full">
              Manage your purchase requests, follow their progress through the university procurement workflow, and access procurement guidance from one refined workspace.
            </p>
          </div>
        </section>

        <section className="mt-4 sm:mt-5" aria-label="Main Feature Shortcuts">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            {/* 1. Create Purchase Request */}
            <Link
              href="/dashboard/new-pr"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-5 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[146px] sm:min-h-[160px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#4D002C] transition-colors">
                  Create PR
                </h2>
                <p className="text-[11px] sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Draft and submit a new request with automated compliance checking
                </p>
              </div>

              <div className="pt-2.5 sm:pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#7B0046]">
                <span>Action</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>

            {/* 2. View Purchase Requests */}
            <Link
              href="/dashboard/purchase-requests"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-5 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[146px] sm:min-h-[160px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#4D002C] transition-colors">
                  Purchase Requests
                </h2>
                <p className="text-[11px] sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Monitor approval stages, view full records, and print official PR documents
                </p>
              </div>

              <div className="pt-2.5 sm:pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-stone-600 group-hover:text-[#7B0046]">
                <span>{prs.length} {prs.length === 1 ? "Record" : "Records"}</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>

            {/* 3. Gab AI Chatbot */}
            <Link
              href="/dashboard/chatbot"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-5 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[146px] sm:min-h-[160px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#4D002C] transition-colors">
                  Gab AI
                </h2>
                <p className="text-[11px] sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Get instant guidance on RA 12009, PR preparation, and procurement steps
                </p>
              </div>

              <div className="pt-2.5 sm:pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-stone-600 group-hover:text-[#7B0046]">
                <span>Gab AI</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>

            {/* 4. Transparency Board */}
            <Link
              href="/dashboard/transparency"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3 sm:p-5 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[146px] sm:min-h-[160px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#4D002C] transition-colors">
                  Transparency Board
                </h2>
                <p className="text-[11px] sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Access official university bidding notices, published awards, and contracts
                </p>
              </div>

              <div className="pt-2.5 sm:pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-stone-600 group-hover:text-[#7B0046]">
                <span>Browse</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>
          </div>
        </section>

        {/* PR Overview */}
        <section className="mt-6 sm:mt-7" aria-label="Purchase Requests Overview">
          <div className="rounded-2xl border border-stone-200/90 bg-white shadow-[0_2px_12px_rgba(45,35,30,0.03)] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-5 py-3 sm:px-6 bg-stone-50/75 border-b border-stone-200/70">
              <div className="flex items-center">
                <h2 className="text-xs sm:text-sm font-bold text-[#4D002C]">
                  PR Overview
                </h2>
              </div>
              <span className="text-[11px] font-medium text-stone-500">
                Requisition status &amp; processing pipeline
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-100 p-1.5 sm:p-2">
              {/* 1. Total Requests */}
              <div className="bg-white p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-black text-[#4D002C] font-mono leading-none">
                    {prs.length}
                  </div>
                  <div className="text-xs font-semibold text-stone-700 mt-1">Total Requests</div>
                  <div className="text-[10px] text-stone-400 font-medium">All-time requisitions</div>
                </div>
              </div>

              {/* 2. In Review */}
              <div className="bg-white p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono leading-none">
                    {stats.pending}
                  </div>
                  <div className="text-xs font-semibold text-stone-700 mt-1">Under Review</div>
                  <div className="text-[10px] text-stone-400 font-medium">Active in workflow</div>
                </div>
              </div>

              {/* 3. Completed */}
              <div className="bg-white p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono leading-none">
                    {stats.completed}
                  </div>
                  <div className="text-xs font-semibold text-stone-700 mt-1">Completed</div>
                  <div className="text-[10px] text-stone-400 font-medium">Fulfilled &amp; delivered</div>
                </div>
              </div>

              {/* 4. Action Required */}
              <div className="p-3.5 sm:p-4 flex items-center">
                {pendingDraftsCount > 0 ? (
                  <Link
                    href="/dashboard/purchase-requests?stage=draft"
                    className="w-full flex items-center gap-3 rounded-xl bg-amber-50/90 border border-amber-300/80 p-2.5 hover:bg-amber-100/80 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 border border-amber-300/80 group-hover:scale-105 transition-transform">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                          Action Required
                        </span>
                      </div>
                      <div className="text-sm font-black text-[#7B0046] font-mono leading-tight mt-0.5">
                        {pendingDraftsCount} {pendingDraftsCount === 1 ? "Draft to Submit" : "Drafts to Submit"}
                      </div>
                      <div className="text-[10px] font-medium text-amber-800/90 truncate">
                        Print &amp; physically submit
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono leading-none">
                        0
                      </div>
                      <div className="text-xs font-semibold text-stone-700 mt-1">Action Required</div>
                      <div className="text-[10px] text-stone-400 font-medium">All submissions in order</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Recent PR Activity */}
        <section className="mt-6 sm:mt-7" aria-label="Recent PR Activity">
          <div className="rounded-2xl border border-stone-200/90 bg-white shadow-[0_2px_12px_rgba(45,35,30,0.03)] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-5 py-3 sm:px-6 bg-stone-50/75 border-b border-stone-200/70">
              <div className="flex items-center">
                <h2 className="text-xs sm:text-sm font-bold text-[#4D002C]">
                  Recent PR Activity
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-stone-500 hidden sm:inline">
                  Latest submitted purchase requests
                </span>
                {prs.length > 0 && (
                  <Link
                    href="/dashboard/purchase-requests"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#7B0046] hover:text-[#4D002C] transition-colors"
                  >
                    <span>View directory ({prs.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {prs.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7B0046]/10 text-[#7B0046]">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-stone-800">
                  No purchase requests recorded yet
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 leading-relaxed">
                  Create your first digital purchase request draft to track its approval through university procurement.
                </p>
                <Link
                  href="/dashboard/new-pr"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7B0046] px-4 py-2 text-xs font-bold text-white hover:bg-[#4D002C] transition-colors shadow-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create New PR</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {prs.slice(0, 3).map((pr) => {
                  const isDone = pr.current_stage === "completed";
                  const isApproved = isApprovedStage(pr.current_stage);
                  const stageNum = stageNumber(pr.current_stage);

                  return (
                    <div
                      key={pr.pr_no}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs mt-0.5 ${
                            isDone
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : isApproved
                              ? "border-[#7B0046]/20 bg-[#7B0046]/5 text-[#7B0046]"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-mono text-xs sm:text-sm font-bold text-[#4D002C]">
                              {pr.pr_no}
                            </span>
                            {pr.pr_no?.includes("TEMP") && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
                                Temporary No.
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(
                                pr.current_stage
                              )}`}
                            >
                              {stageNum && stageNum > 0 ? `Stage ${stageNum} · ` : ""}
                              {statusLabel(pr.current_stage)}
                            </span>
                            <span className="text-[11px] text-stone-400 font-medium">
                              · {new Date(pr.created_at).toLocaleDateString("en-PH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-1 text-xs sm:text-sm font-semibold text-stone-800">
                            {pr.purpose || "Official procurement request"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-stone-500 font-medium">
                            {pr.department || "University Office"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-stone-100 sm:border-0">
                        <div className="text-left sm:text-right">
                          <p className="text-xs sm:text-sm font-bold text-stone-900 font-mono">
                            ₱{Number(pr.total || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/dashboard/pr/${pr.pr_no}`}
                            className="inline-flex min-h-9 items-center gap-1 px-3 py-1.5 rounded-xl bg-[#4D002C] text-white text-[11px] sm:text-xs font-bold shadow-xs hover:bg-[#7B0046] transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Track</span>
                          </Link>
                          <Link
                            href={`/dashboard/pr-print?id=${pr.pr_no}`}
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:text-stone-900 text-xs font-bold hover:bg-stone-50 transition-colors"
                            title="Print PR Form"
                            aria-label={`Print purchase request ${pr.pr_no}`}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-14 border-t border-stone-200/80 pt-6 pb-10 text-center">
          <div className="mx-auto flex max-w-7xl items-center justify-center">
            <p className="text-xs font-medium text-stone-500 tracking-normal">
              © {new Date().getFullYear()} <span className="font-semibold text-stone-700">{SYSTEM_NAME}</span>
            </p>
          </div>
        </footer>
      </main>
      <Chatbot />
      <style jsx global>{`
        .dashboard-page .dashboard-logout::before,
        .dashboard-page .dashboard-logout::after,
        .dashboard-page button[title="Logout"]::before,
        .dashboard-page button[title="Logout"]::after,
        .dashboard-page button[aria-label="Logout"]::before,
        .dashboard-page button[aria-label="Logout"]::after {
          content: none !important;
          display: none !important;
        }
        .dashboard-page .dashboard-logout span { display: inline !important; }
      `}</style>
    </div>
  );
}
