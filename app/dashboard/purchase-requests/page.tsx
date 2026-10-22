"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Eye, FileText, Filter, Loader2, PlusCircle, Printer, Search } from "lucide-react";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS, PROCUREMENT_STAGE_SHORT_LABELS } from "@/lib/procurement-process";
import { supabase } from "@/lib/supabase/client";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";

interface PurchaseRequest {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  created_at: string;
  department: string;
}

const stageNumber = (status: string) =>
  PROCUREMENT_STAGES.find((stage) => stage.key === status)?.number;

const isApprovedStage = (status: string) => {
  const num = stageNumber(status);
  return num !== undefined && num >= 4;
};

const statusColor = (status: string) => {
  if (status === "draft") return "border-stone-200 bg-stone-100 text-stone-700";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected" || status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  if (isApprovedStage(status)) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const statusLabel = (status: string) => {
  if (status === "completed") return "Completed";
  if (status === "rejected") return "Rejected";
  if (status === "cancelled") return "Cancelled";
  return PROCUREMENT_STAGE_LABELS[status] || status.replace(/_/g, " ");
};

const TERMINAL_STAGES = ["completed", "cancelled", "rejected"];

export default function PurchaseRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "approved" | "under_review" | "completed">("all");

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        let { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          const { data: { session } } = await supabase.auth.getSession();
          authUser = session?.user || null;
        }
        if (!authUser) {
          router.replace("/");
          return;
        }
        if (cancelled) return;
        setUser(authUser);

        const { data: prData } = await supabase
          .from("purchase_requests")
          .select("pr_no,purpose,total,current_stage,created_at,department")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false });

        if (!cancelled && prData) {
          setPrs(prData as PurchaseRequest[]);
        }
      } catch (error) {
        console.error("Error loading purchase requests:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const counts = useMemo(() => {
    const total = prs.length;
    const approved = prs.filter((p) => isApprovedStage(p.current_stage) && p.current_stage !== "completed").length;
    const underReview = prs.filter((p) => !isApprovedStage(p.current_stage) && !TERMINAL_STAGES.includes(p.current_stage)).length;
    const completed = prs.filter((p) => p.current_stage === "completed").length;
    return { total, approved, underReview, completed };
  }, [prs]);

  const filteredPrs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prs.filter((pr) => {
      // Filter by tab
      if (stageFilter === "approved" && (!isApprovedStage(pr.current_stage) || pr.current_stage === "completed")) {
        return false;
      }
      if (stageFilter === "under_review" && (isApprovedStage(pr.current_stage) || TERMINAL_STAGES.includes(pr.current_stage))) {
        return false;
      }
      if (stageFilter === "completed" && pr.current_stage !== "completed") {
        return false;
      }

      // Filter by search query
      if (q) {
        const matchesNo = pr.pr_no.toLowerCase().includes(q);
        const matchesPurpose = (pr.purpose || "").toLowerCase().includes(q);
        const matchesDept = (pr.department || "").toLowerCase().includes(q);
        const matchesStage = statusLabel(pr.current_stage).toLowerCase().includes(q);
        return matchesNo || matchesPurpose || matchesDept || matchesStage;
      }

      return true;
    });
  }, [prs, stageFilter, query]);

  if (loading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#F7F5F2] px-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#7B0046]" />
          <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Loading your purchase requests...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#302725]">
      {/* Top Navbar */}
      <SystemPageHeader titlePrimary="Purchase" titleAccent="Requests" icon={FileText} backHref="/dashboard" roleLabel="End User" containerClassName="max-w-7xl px-3.5 sm:px-6 lg:px-8" />

      <main className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#4A002A] via-[#6B003E] to-[#3D0024] p-4 sm:p-8 text-white shadow-sm mb-5 sm:mb-6">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C83F]/35 bg-[#F0C83F]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#F5D766]">
                <FileText className="h-3.5 w-3.5" />
                Procurement Records
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                Purchase Requests Directory
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/80">
                Track, filter, and monitor all your university purchase requests as they advance through verification, PMO approval, bidding, and delivery stages.
              </p>
            </div>
            <Link
              href="/dashboard/new-pr"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#F0C83F]/50 bg-gradient-to-r from-[#F0C83F] to-[#D4A82C] px-5 py-3 text-xs sm:text-sm font-extrabold text-[#4D002C] shadow-md transition hover:-translate-y-0.5 shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Purchase Request</span>
            </Link>
          </div>
        </section>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-6">
          <button
            type="button"
            onClick={() => setStageFilter("all")}
            className={`rounded-xl border p-3 sm:p-4 text-left transition-all ${
              stageFilter === "all"
                ? "border-[#7B0046] bg-white shadow-sm ring-2 ring-[#7B0046]/10"
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">All Requests</p>
            <p className="mt-1 text-xl sm:text-3xl font-black text-[#4D002C]">{counts.total}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Total submissions</p>
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("under_review")}
            className={`rounded-xl border p-4 text-left transition-all ${
              stageFilter === "under_review"
                ? "border-[#F5AB26] bg-white shadow-sm ring-2 ring-[#F5AB26]/20"
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Under Review</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-[#9A7205]">{counts.underReview}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Stages 1 to 3</p>
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("approved")}
            className={`rounded-xl border p-4 text-left transition-all ${
              stageFilter === "approved"
                ? "border-blue-600 bg-white shadow-sm ring-2 ring-blue-500/20"
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Approved</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-blue-900">{counts.approved}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Stage 4 and beyond</p>
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("completed")}
            className={`rounded-xl border p-4 text-left transition-all ${
              stageFilter === "completed"
                ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20"
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-emerald-800">{counts.completed}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Successfully delivered</p>
          </button>
        </div>

        {/* Directory Container */}
        <section className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
          {/* Filter & Search Bar */}
          <div className="border-b border-stone-200/80 bg-stone-50/60 p-3 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Tab Selector */}
              <div className="flex w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-stone-200/70 bg-stone-100 p-1 md:w-fit">
                <button
                  type="button"
                  onClick={() => setStageFilter("all")}
                  className={`flex-none whitespace-nowrap px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-all ${
                    stageFilter === "all"
                      ? "bg-white text-[#4D002C] font-bold shadow-xs border border-stone-200/60"
                      : "text-stone-600 hover:text-stone-900 font-semibold"
                  }`}
                >
                  All ({counts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter("under_review")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    stageFilter === "under_review"
                      ? "bg-white text-[#4D002C] font-bold shadow-xs border border-stone-200/60"
                      : "text-stone-600 hover:text-stone-900 font-semibold"
                  }`}
                >
                  Under Review ({counts.underReview})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter("approved")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    stageFilter === "approved"
                      ? "bg-white text-[#4D002C] font-bold shadow-xs border border-stone-200/60"
                      : "text-stone-600 hover:text-stone-900 font-semibold"
                  }`}
                >
                  Approved ({counts.approved})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    stageFilter === "completed"
                      ? "bg-white text-[#4D002C] font-bold shadow-xs border border-stone-200/60"
                      : "text-stone-600 hover:text-stone-900 font-semibold"
                  }`}
                >
                  Completed ({counts.completed})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search PR No., purpose, office..."
                  className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 py-2.5 sm:py-2 text-xs sm:text-sm outline-none focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/10"
                />
              </div>
            </div>
          </div>

          {/* List of PRs */}
          {filteredPrs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-stone-300" />
              <h3 className="mt-3 text-sm sm:text-base font-bold text-stone-800">
                {query ? "No matching purchase requests found" : "No purchase requests in this section"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 leading-relaxed">
                {query
                  ? "Try searching for a different keyword or clearing the search filter."
                  : "Submit a new procurement request to track its progress through university approval."}
              </p>
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-[#4D002C] hover:bg-stone-50"
                >
                  Clear search
                </button>
              ) : (
                <Link
                  href="/dashboard/new-pr"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7B0046] px-4 py-2 text-xs font-bold text-white hover:bg-[#4D002C] transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Start New Request</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredPrs.map((pr) => {
                const isApproved = isApprovedStage(pr.current_stage);
                const isDone = pr.current_stage === "completed";
                const stageNum = stageNumber(pr.current_stage);

                return (
                  <div
                    key={pr.pr_no}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-5 hover:bg-stone-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                      <div
                        className={`flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border shadow-xs ${
                          isDone
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : isApproved
                            ? "border-[#7B0046]/15 bg-[#7B0046]/5 text-[#7B0046]"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : isApproved ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-mono text-[13px] sm:text-base font-bold text-[#4D002C]">
                            {pr.pr_no}
                          </span>
                          {pr.pr_no?.includes("TEMP") && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
                              Temporary No.
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isDone
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : isApproved
                                ? "bg-stone-100 text-stone-700 border-stone-200"
                                : pr.current_stage === "draft"
                                ? "bg-stone-100 text-stone-700 border-stone-200"
                                : "bg-amber-50 text-amber-800 border-amber-200/70"
                            }`}
                          >
                            {isDone ? "Completed" : isApproved ? "Approved" : pr.current_stage === "draft" ? "Draft" : "Under Review"}
                          </span>
                          <span className="text-[11px] sm:text-xs text-stone-400 font-medium">
                            · {new Date(pr.created_at).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 sm:truncate text-xs sm:text-sm font-semibold leading-snug text-stone-800">
                          {pr.purpose || "Official procurement request"}
                        </p>
                        <p className="mt-0.5 text-[11px] sm:text-xs text-stone-500 font-medium">
                          {pr.department || "University Office"}
                        </p>
                        <div className="mt-2 sm:hidden">
                          <span
                            className={`inline-flex max-w-full items-center rounded-lg border px-2 py-1 text-[11px] font-semibold leading-snug ${statusColor(pr.current_stage)}`}
                          >
                            {stageNum && stageNum > 0 ? `Stage ${stageNum} · ` : ""}
                            {PROCUREMENT_STAGE_SHORT_LABELS[pr.current_stage] || statusLabel(pr.current_stage)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t border-stone-100 sm:border-0">
                      <div className="text-left sm:text-right">
                        <p className="text-sm sm:text-base font-bold text-stone-900">
                          ₱{Number(pr.total || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <span
                          className={`hidden sm:inline-flex mt-1 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusColor(
                            pr.current_stage
                          )}`}
                        >
                          {stageNum ? `Stage ${stageNum} · ` : ""}
                          {statusLabel(pr.current_stage)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/dashboard/pr/${pr.pr_no}`}
                          className="inline-flex min-h-10 items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-[#4D002C] text-white text-[11px] sm:text-xs font-bold shadow-xs hover:bg-[#7B0046] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Track PR</span>
                        </Link>
                        <Link
                          href={`/dashboard/pr-print?id=${pr.pr_no}`}
                          className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1 px-2.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors"
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
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-stone-500">
        MSU GenSan Procurement Management System · Purchase Requests Directory · RA 12009 Compliant
      </footer>
    </div>
  );
}
