"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Eye, FileText, Filter, PlusCircle, Printer, Search, Trash2, X } from "lucide-react";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { supabase } from "@/lib/supabase/client";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import LoadingScreen from "@/components/LoadingScreen";
import { SYSTEM_NAME } from "@/lib/system-branding";

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
  const [stageFilter, setStageFilter] = useState<"all" | "draft" | "under_review" | "approved" | "completed">("all");
  const [deletingPrNo, setDeletingPrNo] = useState<string | null>(null);
  const [draftPendingDeletion, setDraftPendingDeletion] = useState<PurchaseRequest | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stageParam = params.get("stage");
      if (stageParam === "draft") {
        setStageFilter("draft");
      } else if (stageParam === "under_review") {
        setStageFilter("under_review");
      } else if (stageParam === "approved") {
        setStageFilter("approved");
      } else if (stageParam === "completed") {
        setStageFilter("completed");
      }
    }
  }, []);

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

  const deleteDraftPR = async () => {
    const pr = draftPendingDeletion;
    if (!pr || pr.current_stage !== "draft" || deletingPrNo) return;
    setDeletingPrNo(pr.pr_no);
    try {
      const response = await fetch("/api/pr/delete-draft", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prNo: pr.pr_no }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to delete this draft.");
      setPrs((current) => current.filter((item) => item.pr_no !== pr.pr_no));
      setDraftPendingDeletion(null);
    } catch (error) {
      console.error("Draft PR deletion failed:", error);
      window.alert(error instanceof Error ? error.message : "Unable to delete this draft. Please try again.");
    } finally {
      setDeletingPrNo(null);
    }
  };

  const counts = useMemo(() => {
    const total = prs.length;
    const drafts = prs.filter((p) => p.current_stage === "draft").length;
    const approved = prs.filter((p) => isApprovedStage(p.current_stage) && p.current_stage !== "completed").length;
    const underReview = prs.filter((p) => p.current_stage !== "draft" && !isApprovedStage(p.current_stage) && !TERMINAL_STAGES.includes(p.current_stage)).length;
    const completed = prs.filter((p) => p.current_stage === "completed").length;
    return { total, drafts, approved, underReview, completed };
  }, [prs]);

  const filteredPrs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prs.filter((pr) => {
      // Filter by tab
      if (stageFilter === "draft" && pr.current_stage !== "draft") {
        return false;
      }
      if (stageFilter === "approved" && (!isApprovedStage(pr.current_stage) || pr.current_stage === "completed")) {
        return false;
      }
      if (stageFilter === "under_review" && (pr.current_stage === "draft" || isApprovedStage(pr.current_stage) || TERMINAL_STAGES.includes(pr.current_stage))) {
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

  if (loading) return <LoadingScreen label="Loading your purchase requests..." />;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#302725]">
      {/* Top Navbar */}
      <SystemPageHeader titlePrimary="Purchase" titleAccent="Requests" backHref="/dashboard" roleLabel="End User" containerClassName="max-w-7xl px-3.5 sm:px-6 lg:px-8" />

      <main className="mx-auto max-w-7xl px-3.5 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4 sm:mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-[1.65rem] md:text-[1.8rem] font-semibold tracking-[-0.035em] leading-tight text-[#4D002C]">My Purchase Requests</h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-stone-600">
              Review your requests, check their current status, and print drafts for physical submission.
            </p>
          </div>
          <Link
            href="/dashboard/new-pr"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#7B0046] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#4D002C] shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Purchase Request</span>
          </Link>
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
                  onClick={() => setStageFilter("draft")}
                  className={`flex-none whitespace-nowrap px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-all ${
                    stageFilter === "draft"
                      ? "bg-white text-amber-900 font-bold shadow-xs border border-amber-300 ring-1 ring-amber-400/40"
                      : "text-amber-800 hover:text-amber-950 font-semibold"
                  }`}
                >
                  Draft PRs ({counts.drafts})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter("under_review")}
                  className={`flex-none whitespace-nowrap px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-all ${
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
                  className={`flex-none whitespace-nowrap px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-all ${
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
                  className={`flex-none whitespace-nowrap px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-all ${
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

          {/* Draft PR Physical Submission Notice Banner */}
          {stageFilter === "draft" && (
            <div className="border-b border-amber-200/90 bg-gradient-to-r from-amber-50 via-amber-50/70 to-stone-50 px-3.5 py-2.5 sm:px-6 sm:py-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="text-[11px] sm:text-xs leading-relaxed text-amber-950">
                  <p className="font-bold text-amber-900">
                    Draft Purchase Requests Awaiting Physical Submission
                  </p>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-stone-700">
                    These PRs are drafted and saved online. Requisitioners must print the official PR form (using the Print button below) and physically submit it with required attachments (PPMP/APP reference, specifications) to the Procurement Management Office (PMO) to begin official verification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* List of PRs */}
          {filteredPrs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-stone-300" />
              <h3 className="mt-3 text-sm sm:text-base font-bold text-stone-800">
                {query
                  ? "No matching purchase requests found"
                  : stageFilter === "draft"
                  ? "No draft purchase requests awaiting submission"
                  : "No purchase requests in this section"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 leading-relaxed">
                {query
                  ? "Try searching for a different keyword or clearing the search filter."
                  : stageFilter === "draft"
                  ? "All your created purchase requests have been submitted or you have not drafted a new request yet."
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-stone-50/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-[#4D002C]">
                            {pr.pr_no}
                          </span>
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
                          className="inline-flex min-h-9 items-center gap-1 px-3 py-1.5 rounded-xl bg-[#7B0046] text-white text-[11px] sm:text-xs font-bold shadow-xs hover:bg-[#65003A] transition-colors"
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
                        {pr.current_stage === "draft" && (
                          <button
                            type="button"
                            onClick={() => setDraftPendingDeletion(pr)}
                            disabled={deletingPrNo === pr.pr_no}
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            title="Delete unsubmitted draft"
                            aria-label={`Delete draft purchase request ${pr.pr_no}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {draftPendingDeletion && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1B1018]/65 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingPrNo) setDraftPendingDeletion(null);
          }}
        >
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-draft-title" aria-describedby="delete-draft-description" className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-red-100 bg-red-50/80 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"><AlertTriangle className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="delete-draft-title" className="text-base font-extrabold text-[#4D002C]">Delete Draft Purchase Request?</h2>
                <p className="mt-1 text-xs font-medium text-stone-600">{draftPendingDeletion.pr_no}</p>
              </div>
              <button type="button" onClick={() => setDraftPendingDeletion(null)} disabled={Boolean(deletingPrNo)} className="rounded-lg p-1.5 text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-40" aria-label="Close confirmation"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <p id="delete-draft-description" className="text-sm leading-relaxed text-stone-700">
                Are you sure you want to delete this draft? Once deleted, it will no longer appear in your Draft PR list or the Admin Dashboard&apos;s active Draft PR records. This action cannot be undone through the system.
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">Important reminder</p>
                <p className="mt-1.5 text-xs leading-relaxed text-amber-900">Only unsubmitted draft PRs can be deleted. Physically submitted and officially registered PRs cannot be deleted by end users.</p>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDraftPendingDeletion(null)} disabled={Boolean(deletingPrNo)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={deleteDraftPR} disabled={Boolean(deletingPrNo)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {deletingPrNo ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Deleting...</> : <><Trash2 className="h-4 w-4" />Delete Draft PR</>}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-stone-500">
        {SYSTEM_NAME} · Purchase Requests Directory · RA 12009 Compliant
      </footer>
    </div>
  );
}
