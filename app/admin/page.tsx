"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { ActionFeedbackModal, type FeedbackTone } from "@/components/ui/ActionFeedbackModal";
import AdminPRFullFormModal from "@/components/AdminPRFullFormModal";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import { Check, CheckCircle, Clock, Eye, FileCheck, FileText, Loader2, MessageSquare, RefreshCw, Search, Trash2, User, Users, X, XCircle, AlertCircle, ChevronRight } from "lucide-react";

interface PR {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  created_at: string;
  department: string;
  user_id: string;
  printed_name: string;
  pr_date: string;
  [key: string]: unknown;
}
interface StageHistory {
  stage_name: string;
  stage_key: string;
  completed_at: string;
  remarks?: string;
  status?: string;
}

const STAGES = PROCUREMENT_STAGES;
const LABELS: Record<string, string> = { ...PROCUREMENT_STAGE_LABELS, draft: "Draft", rejected: "Rejected", cancelled: "Cancelled", completed: "Completed" };
const COLORS: Record<string, string> = {
  receipt_of_pr: "bg-amber-100 text-amber-700", ppmp_app_verification: "bg-yellow-100 text-yellow-700",
  pmo_director_validation: "bg-blue-100 text-blue-700", pr_pre_numbering: "bg-indigo-100 text-indigo-700",
  budget_endorsement: "bg-purple-100 text-purple-700", approved_pr_received: "bg-violet-100 text-violet-700",
  rfq_generation: "bg-orange-100 text-orange-700", rfq_evaluation: "bg-orange-100 text-orange-700",
  rfq_printing: "bg-pink-100 text-pink-700", philgeps_posting: "bg-pink-100 text-pink-700",
  aoq_preparation: "bg-cyan-100 text-cyan-700", aoq_evaluation: "bg-cyan-100 text-cyan-700",
  awarded_aoq_received: "bg-teal-100 text-teal-700", po_generation_evaluation: "bg-teal-100 text-teal-700",
  pmo_director_po_validation: "bg-emerald-100 text-emerald-700", budget_po_endorsement: "bg-emerald-100 text-emerald-700",
  approved_po_received: "bg-green-100 text-green-700", po_release_supplier: "bg-green-100 text-green-700",
  spmo_endorsement: "bg-lime-100 text-lime-700", monitoring_documentation: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600", rejected: "bg-red-100 text-red-700", cancelled: "bg-red-100 text-red-700", completed: "bg-emerald-100 text-emerald-700",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [fullPrNo, setFullPrNo] = useState<string | null>(null);
  const [action, setAction] = useState<"complete" | "remark" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletePR, setDeletePR] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; tone: FeedbackTone; title: string; message: string }>({ open: false, tone: "success", title: "", message: "" });
  const [officialPrInput, setOfficialPrInput] = useState("");
  const [showOfficialPrModal, setShowOfficialPrModal] = useState(false);
  const [approvalGroupFilter, setApprovalGroupFilter] = useState<"all" | "approved" | "drafts">("all");

  const selectedPRRef = useRef<PR | null>(null);
  selectedPRRef.current = selectedPR;

  const showFeedback = (tone: FeedbackTone, title: string, message: string) => setFeedback({ open: true, tone, title, message });
  const loadData = async () => {
    const { data, error } = await supabase.from("purchase_requests").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Failed to load PRs:", error); return; }
    setPrs((data || []) as PR[]);
  };
  const manualRefresh = async () => { if (refreshing) return; setRefreshing(true); try { await loadData(); } finally { setRefreshing(false); } };
  const loadHistory = async (prNo: string) => {
    const { data, error } = await supabase.from("pr_stages_completed").select("stage_name,stage_key,completed_at,remarks,status").eq("pr_no", prNo).order("completed_at", { ascending: true });
    if (error) { console.error("Failed to load stage history:", error); setHistory([]); } else setHistory((data || []) as StageHistory[]);
  };

  useEffect(() => {
    (async () => {
      try {
        let { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          const { data: { session } } = await supabase.auth.getSession();
          authUser = session?.user || null;
        }
        if (!authUser) { router.replace("/"); return; }
        const { data: profile } = await supabase.from("users").select("role,is_active,status").eq("id", authUser.id).single();
        if (profile?.role !== "admin" || profile?.is_active === false || (profile?.status && profile.status !== "approved")) { router.replace("/dashboard"); return; }
        await loadData();
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [router]);

  useEffect(() => {
    const channel = supabase.channel("admin-live-procurement-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, (payload) => {
        void loadData();
        if (selectedPRRef.current && payload.new && (payload.new as any).pr_no === selectedPRRef.current.pr_no) {
          setSelectedPR(payload.new as PR);
          void loadHistory(selectedPRRef.current.pr_no);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pr_stages_completed" }, (payload) => {
        if (selectedPRRef.current && payload.new && (payload.new as any).pr_no === selectedPRRef.current.pr_no) void loadHistory(selectedPRRef.current.pr_no);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const isApprovedPR = (pr: PR) => {
    const stage = STAGES.find((s) => s.key === pr.current_stage);
    return stage ? stage.number >= 4 : ["completed"].includes(pr.current_stage);
  };

  const filtered = useMemo(() => prs.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || p.pr_no.toLowerCase().includes(q) || String(p.purpose || "").toLowerCase().includes(q) || String(p.department || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || p.current_stage === statusFilter;
    const matchesDept = departmentFilter === "all" || p.department === departmentFilter;
    const isApproved = isApprovedPR(p);
    const matchesGroup = approvalGroupFilter === "all" || (approvalGroupFilter === "approved" ? isApproved : !isApproved);
    return matchesSearch && matchesStatus && matchesDept && matchesGroup;
  }), [prs, searchTerm, statusFilter, departmentFilter, approvalGroupFilter]);
  const departments = useMemo(() => [...new Set(prs.map((p) => p.department).filter(Boolean))], [prs]);
  const stats = useMemo(() => ({
    total: prs.length,
    pending: prs.filter((p) => !["completed", "rejected", "cancelled"].includes(p.current_stage)).length,
    inProgress: prs.filter((p) => !["receipt_of_pr", "completed", "rejected", "cancelled"].includes(p.current_stage)).length,
    completed: prs.filter((p) => p.current_stage === "completed").length,
    rejected: prs.filter((p) => ["rejected", "cancelled"].includes(p.current_stage)).length,
  }), [prs]);

  const currentStage = (pr: PR | null) => pr ? STAGES.find((s) => s.key === pr.current_stage) : null;
  const currentIndex = (pr: PR | null) => pr ? STAGES.findIndex((s) => s.key === pr.current_stage) : -1;
  const nextStage = (pr: PR) => { const i = currentIndex(pr); return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null; };
  const openDetails = async (pr: PR) => { setSelectedPR(pr); setHistory([]); setShowDetails(true); await loadHistory(pr.pr_no); };
  const openAction = (type: "complete" | "remark" | "reject", targetPR?: PR) => {
    if (targetPR) setSelectedPR(targetPR);
    setAction(type);
    setRemarks("");
    setOfficialPrInput("");
  };

  const submitOfficialPrAssignment = async () => {
    if (!selectedPR || busy) return;
    const cleanNo = officialPrInput.trim();
    if (!cleanNo) {
      showFeedback("warning", "PR Number Required", "Please enter the official PR number.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/assign-official-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPrNo: selectedPR.pr_no,
          officialPrNo: cleanNo,
          remarks: remarks.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to assign official PR number");
      setShowOfficialPrModal(false);
      setOfficialPrInput("");
      setRemarks("");
      if (result.updatedPR) {
        setSelectedPR(result.updatedPR);
        setPrs((prev) => prev.map((p) => p.pr_no === result.oldPrNo ? result.updatedPR : p));
      }
      if (result.stageHistory) setHistory(result.stageHistory);
      void loadData();
      showFeedback("success", "Official PR Number Assigned", `Successfully updated ${result.oldPrNo} to official number ${result.officialPrNo}. Data is synchronized across both end-user and admin portals.`);
    } catch (e: any) {
      console.error(e);
      showFeedback("error", "Assignment Failed", e.message || "Unable to assign official PR number.");
    } finally {
      setBusy(false);
    }
  };

  const submitAction = async () => {
    if (!selectedPR || !action || busy) return;
    if ((action === "remark" || action === "reject") && !remarks.trim()) { showFeedback("warning", "Remark Required", "Please provide a remark before continuing."); return; }
    if (action === "complete" && !nextStage(selectedPR)) { showFeedback("info", "Process Complete", "This purchase request has already reached the final stage."); return; }
    if (
      action === "complete" &&
      selectedPR.current_stage === "pr_pre_numbering" &&
      selectedPR.pr_no.includes("TEMP") &&
      !officialPrInput.trim()
    ) {
      showFeedback("warning", "Official PR Number Required", "Please enter the official PR number to complete Step 4: Pre-Numbering and Control of PRs.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/complete-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prNo: selectedPR.pr_no,
          action,
          newStatus: action === "complete" ? nextStage(selectedPR)?.key : undefined,
          remarks: remarks.trim(),
          officialPrNo: (action === "complete" && selectedPR.current_stage === "pr_pre_numbering") ? (officialPrInput.trim() || undefined) : undefined,
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      setAction(null); setRemarks(""); setOfficialPrInput("");
      const oldNo = selectedPR.pr_no;
      if (result.updatedPR) {
        setSelectedPR(result.updatedPR);
        setPrs((prev) => prev.map((p) => (p.pr_no === oldNo || p.pr_no === result.updatedPR.pr_no) ? result.updatedPR : p));
      }
      if (result.stageHistory) setHistory(result.stageHistory);
      void loadData();
      const nextInfo = action === "complete" && result.newStatus ? STAGES.find((s) => s.key === result.newStatus) : null;
      const finalPrNo = result.officialPrNo || selectedPR.pr_no;
      if (action === "complete") {
        showFeedback(
          "success",
          "Stage Completed Successfully",
          `${finalPrNo} has been advanced to ${nextInfo ? `Stage ${nextInfo.number}: ${nextInfo.label}` : "the next stage"}.${result.oldPrNo ? ` PR number was updated from ${result.oldPrNo} to official number ${result.officialPrNo}.` : ""}`
        );
      }
      else if (action === "remark") showFeedback("success", "Remark Recorded", `Your procurement remark for ${selectedPR.pr_no} has been recorded.`);
      else showFeedback("success", "Purchase Request Rejected", `${selectedPR.pr_no} has been marked as rejected.`);
    } catch (e: any) { console.error(e); showFeedback("error", "Action Failed", e.message || "Unable to complete the requested action."); }
    finally { setBusy(false); }
  };

  const deleteRequest = async () => {
    if (!deletePR) return;
    try {
      const { error: itemsError } = await supabase.from("pr_items").delete().eq("pr_no", deletePR); if (itemsError) throw itemsError;
      const { error: historyError } = await supabase.from("pr_stages_completed").delete().eq("pr_no", deletePR); if (historyError) throw historyError;
      const { error } = await supabase.from("purchase_requests").delete().eq("pr_no", deletePR); if (error) throw error;
      const deleted = deletePR;
      setDeletePR(null);
      if (selectedPR?.pr_no === deleted) {
        setShowDetails(false);
        setSelectedPR(null);
      }
      await loadData();
      showFeedback("success", "Purchase Request Deleted", `${deleted} and its recorded stage history have been permanently removed.`);
    } catch (e) { console.error(e); showFeedback("error", "Delete Failed", "The purchase request could not be deleted. Please try again."); }
  };
if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]"><Loader2 className="h-10 w-10 animate-spin text-[#7B0046]" /></div>;

  const detailStage = currentStage(selectedPR);
  const detailIndex = currentIndex(selectedPR);
  const detailPercent = selectedPR?.current_stage === "completed" ? 100 : detailIndex >= 0 ? Math.round(((detailIndex + 1) / 20) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800 admin-dashboard-page">
      <SystemPageHeader titlePrimary="MSU GenSan Procurement Management" titleAccent="System" mobileTitlePrimary="MSU GenSan" mobileTitleAccent="Admin" compactOnMobile workspaceLabel="Administrator Workspace" brandLogo backHref={null} roleLabel="Administrator" containerClassName="max-w-7xl px-3.5 sm:px-6" />

      <main className="max-w-7xl mx-auto min-w-0 px-3.5 sm:px-6 py-4 sm:py-7">
        <div className="flex flex-col lg:flex-row justify-between gap-5 mb-7"><div><h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4D002C]">Admin Dashboard</h1><p className="text-[13px] sm:text-sm text-stone-600 mt-1">Manage Purchase Requests through the official university PMO procurement workflow.</p></div><div className="flex flex-wrap gap-2 items-start"><Link href="/admin/users" className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-[#7B0046] hover:bg-[#FDF2F7] flex items-center gap-2"><Users className="h-4 w-4" /> User Approvals</Link><Link href="/admin/inquiries" className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-[#7B0046] hover:bg-[#FDF2F7] flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Inquiries</Link><button onClick={() => void manualRefresh()} disabled={refreshing} className="admin-refresh-btn inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#7B0046] border border-[#7B0046] rounded-xl text-xs sm:text-sm font-bold text-white hover:bg-[#4D002C] disabled:opacity-60 disabled:cursor-wait shadow-sm transition-all"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /><span>{refreshing ? "Refreshing…" : "Refresh"}</span></button></div></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-7">{[[stats.total, "Total PRs", FileCheck, "text-[#7B0046]"], [stats.pending, "In Progress", Clock, "text-amber-600"], [stats.completed, "Completed", CheckCircle, "text-emerald-700"], [stats.rejected, "Rejected", XCircle, "text-red-600"]].map(([n, l, I, c]: any) => <div key={l} className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200 shadow-[0_5px_20px_rgba(45,20,10,0.035)]"><div className="flex justify-between items-center"><div><div className={`text-xl sm:text-2xl font-bold ${c}`}>{n}</div><div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5">{l}</div></div><I className={`h-4 w-4 sm:h-5 sm:w-5 ${c}`} /></div></div>)}</div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 mb-4 sm:mb-5 shadow-[0_5px_20px_rgba(45,20,10,0.03)] flex flex-col lg:flex-row gap-2 sm:gap-3 items-stretch lg:items-center justify-between">
          <div className="relative min-w-0 w-full lg:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by PR number, purpose, or requesting department..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046] text-sm"
            />
          </div>
          <div className="admin-filter-controls flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-nowrap sm:gap-3 sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-select min-w-0 w-full max-w-full sm:w-auto px-3 py-2.5 sm:px-3.5 rounded-xl border border-stone-200 bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046]"
            >
              <option value="all">All Statuses ({prs.length})</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.number}. {s.shortLabel}</option>
              ))}
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {(searchTerm || statusFilter !== "all" || departmentFilter !== "all") && (
              <button
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); setDepartmentFilter("all"); }}
                className="self-start sm:self-auto px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 whitespace-nowrap transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Purchase Requests Table Card */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_8px_30px_rgba(45,20,10,0.04)]">
          <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-[#4D002C]">Purchase Requests</h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">Workflow stages are enforced sequentially in accordance with PMO procurement rules.</p>
            </div>
            <div className="admin-pr-list-controls flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="admin-pr-group-tabs flex w-full max-w-full items-center gap-1 overflow-x-auto no-scrollbar p-1 bg-stone-100 border border-stone-200/80 rounded-xl sm:w-fit sm:overflow-visible">
                <button
                  type="button"
                  onClick={() => setApprovalGroupFilter("all")}
                  className={`flex-none whitespace-nowrap px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs transition-all ${
                    approvalGroupFilter === "all"
                      ? "bg-white text-[#4D002C] font-bold shadow-xs border border-stone-200/60"
                      : "text-stone-600 hover:text-stone-900 font-semibold"
                  }`}
                >
                  All <span className="ml-1 text-[11px] font-medium text-stone-500">({prs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalGroupFilter("approved")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    approvalGroupFilter === "approved"
                      ? "bg-white text-[#4D002C] font-bold shadow-xs border border-stone-200/60"
                      : "text-stone-600 hover:text-stone-900 font-semibold"
                  }`}
                >
                  Approved <span className="ml-1 text-[11px] font-medium text-stone-500">({prs.filter(isApprovedPR).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalGroupFilter("drafts")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    approvalGroupFilter === "drafts"
                      ? "bg-white text-[#4D002C] font-bold shadow-xs border border-stone-200/60"
                      : "text-stone-600 hover:text-stone-900 font-semibold"
                  }`}
                >
                  Under Review <span className="ml-1 text-[11px] font-medium text-stone-500">({prs.filter((p) => !isApprovedPR(p)).length})</span>
                </button>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 w-fit">
                <span className="h-2 w-2 rounded-full bg-[#7B0046]" />
                {filtered.length} {filtered.length === 1 ? "Record" : "Records"}
              </span>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm font-medium text-stone-500">No purchase requests found matching the filter criteria.</div>
          ) : (
            <div className="w-full overflow-hidden">
              {/* Desktop / Tablet View: Table fits 100% width with no horizontal scroll */}
              <div className="hidden md:block w-full">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-[#FAF7F2] border-b border-stone-200 text-stone-600">
                    <tr>
                      <th className="w-[22%] lg:w-[20%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">PR #</th>
                      <th className="w-[20%] lg:w-[19%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Purpose</th>
                      <th className="w-[14%] lg:w-[13%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Department</th>
                      <th className="w-[13%] lg:w-[12%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Amount</th>
                      <th className="w-[19%] lg:w-[17%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Current Status</th>
                      <th className="hidden lg:table-cell lg:w-[10%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Date</th>
                      <th className="w-[12%] lg:w-[9%] px-3 lg:px-4 py-3.5 text-right text-xs uppercase tracking-wider font-bold pr-4 lg:pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((pr) => {
                      const stepInfo = currentStage(pr);
                      const stageNumber = stepInfo?.number || 0;
                      return (
                        <tr
                          key={pr.pr_no}
                          onClick={() => void openDetails(pr)}
                          className="hover:bg-[#FFFDF7] transition-colors cursor-pointer"
                        >
                          <td className="px-3 lg:px-4 py-3.5 align-middle max-w-0 overflow-hidden">
                            <div className="flex flex-col items-start gap-1 min-w-0 max-w-full overflow-hidden">
                              <span
                                className="font-mono text-xs font-extrabold text-[#7B0046] tracking-tight truncate max-w-full block min-w-0 select-all"
                                title={pr.pr_no}
                              >
                                {pr.pr_no}
                              </span>
                              {pr.pr_no.includes("TEMP") && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-[9px] font-black uppercase tracking-wider shrink-0 max-w-full whitespace-nowrap"
                                  title="Temporary PR Number (Awaiting Pre-Numbering at Step 4)"
                                >
                                  Temp #
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-3.5 align-middle text-xs lg:text-sm text-stone-800 font-medium">
                            <div className="truncate" title={pr.purpose}>
                              {pr.purpose || "—"}
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-3.5 align-middle text-xs lg:text-sm text-stone-600 font-medium">
                            <div className="truncate" title={pr.department}>
                              {pr.department || "—"}
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-3.5 align-middle text-xs lg:text-sm font-bold text-stone-900 whitespace-nowrap font-mono">
                            ₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 lg:px-4 py-3.5 align-middle">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] lg:text-xs font-bold border max-w-full truncate ${COLORS[pr.current_stage] || "bg-stone-100 text-stone-700 border-stone-200"}`} title={LABELS[pr.current_stage] || pr.current_stage}>
                              <span className="truncate">{stageNumber ? `Stage ${stageNumber}: ` : ""}{LABELS[pr.current_stage] || pr.current_stage}</span>
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-3 lg:px-4 py-3.5 align-middle text-xs font-semibold text-stone-500 whitespace-nowrap">
                            {pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                          </td>
                          <td className="px-3 lg:px-4 py-3.5 align-middle text-right pr-4 lg:pr-6 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => void openDetails(pr)}
                              title={`View details and actions for ${pr.pr_no}`}
                              className="inline-flex items-center gap-1 h-7.5 px-2.5 lg:px-3 rounded-lg lg:rounded-xl bg-white hover:bg-stone-50 text-[#7B0046] text-xs font-bold border border-stone-200 hover:border-[#7B0046]/40 transition-all shadow-2xs hover:shadow-xs active:scale-95"
                            >
                              <Eye className="h-3.5 w-3.5 text-[#7B0046]" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Clean card rows fitting 100% width without horizontal scroll */}
              <div className="md:hidden divide-y divide-stone-100">
                {filtered.map((pr) => {
                  const stepInfo = currentStage(pr);
                  const stageNumber = stepInfo?.number || 0;
                  return (
                    <div
                      key={pr.pr_no}
                      onClick={() => void openDetails(pr)}
                      className="p-3 sm:p-4 hover:bg-[#FFFDF7] transition-colors cursor-pointer flex flex-col gap-2 sm:gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                          <span className="font-mono text-xs sm:text-sm font-extrabold text-[#7B0046] tracking-tight truncate max-w-full block" title={pr.pr_no}>{pr.pr_no}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {pr.pr_no.includes("TEMP") && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-[9px] font-black uppercase">
                                Temp #
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[13px] sm:text-sm font-bold text-stone-900 shrink-0">
                          ₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <p className="text-[13px] sm:text-sm font-medium leading-snug text-stone-800 line-clamp-2 sm:line-clamp-1">{pr.purpose || "Official procurement request"}</p>

                      <div className="flex items-center justify-between gap-2 text-xs text-stone-500 font-medium">
                        <span className="truncate">{pr.department || "University Office"}</span>
                        <span className="shrink-0">{pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "—"}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 min-w-0">
                        <span className={`inline-flex min-w-0 flex-1 items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-[11px] sm:text-xs font-bold border truncate max-w-[calc(100%-4.25rem)] sm:max-w-[220px] ${COLORS[pr.current_stage] || "bg-stone-100 text-stone-700 border-stone-200"}`}>
                          <span className="truncate sm:hidden">{stageNumber ? `Stage ${stageNumber}: ` : ""}{stepInfo?.shortLabel || LABELS[pr.current_stage] || pr.current_stage}</span>
                          <span className="hidden truncate sm:inline">{stageNumber ? `Stage ${stageNumber}: ` : ""}{LABELS[pr.current_stage] || pr.current_stage}</span>
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); void openDetails(pr); }}
                          className="inline-flex min-h-10 sm:h-8 items-center justify-center gap-1 px-3 sm:px-2.5 rounded-lg bg-white text-[#7B0046] text-xs font-bold border border-stone-200 shadow-2xs hover:bg-stone-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {showDetails && selectedPR && (
        <div className="admin-pr-detail-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-2 sm:p-5">
          <div className="admin-pr-detail-modal bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[94vh] overflow-hidden flex flex-col border border-stone-200">
            {/* Modal Header */}
            <div className="admin-pr-detail-header sticky top-0 bg-white border-b border-stone-200 px-3.5 sm:px-6 py-3 sm:py-4 flex justify-between items-start gap-2 z-10 shrink-0 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3 flex-wrap">
                  <h3 className="max-w-full break-words text-base sm:text-xl font-extrabold text-[#4D002C] tracking-tight">PR {selectedPR.pr_no}</h3>
                  {selectedPR.pr_no.includes("TEMP") && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                      Temporary Control #
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border ${COLORS[selectedPR.current_stage] || "bg-stone-100 text-stone-700 border-stone-200"}`}>
                    {detailStage ? `Stage ${detailStage.number}: ${detailStage.shortLabel}` : LABELS[selectedPR.current_stage] || selectedPR.current_stage}
                  </span>
                </div>
                <p className="text-[11px] sm:text-sm text-stone-500 mt-1 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 leading-relaxed">
                  <span><b>Department:</b> {selectedPR.department || "—"}</span>
                  <span>•</span>
                  <span><b>Total:</b> ₱{Number(selectedPR.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {selectedPR.printed_name && (
                    <>
                      <span>•</span>
                      <span><b>Requester:</b> {selectedPR.printed_name}</span>
                    </>
                  )}
                  {selectedPR.created_at && (
                    <>
                      <span>•</span>
                      <span><b>Submitted:</b> {new Date(selectedPR.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                aria-label="Close PR details"
                className="shrink-0 p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="admin-pr-detail-body min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5">
              {/* Procurement Actions & Workflow Controls Card */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-3 sm:p-5 shadow-xs space-y-3">
                {/* Primary Stage Action Card */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-stone-50/90 p-3 sm:p-5 rounded-xl border border-stone-200/90 shadow-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-[#7B0046] text-white shadow-xs border border-[#630038]">
                      <span className="font-mono font-bold text-base sm:text-lg leading-none tracking-tight">
                        {detailStage?.number ? detailStage.number : "PR"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded">
                          Current Stage {detailStage?.number || ""}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-stone-900 truncate mt-1">
                        {nextStage(selectedPR) ? `Advance to Stage ${nextStage(selectedPR)?.number}: ${nextStage(selectedPR)?.label}` : detailStage ? `Stage ${detailStage.number}: ${detailStage.label}` : "Procurement Workflow"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {/* Step 4 Official PR Assignment button - Only at Stage 4 */}
                    {selectedPR.current_stage === "pr_pre_numbering" && (
                      <button
                        onClick={() => {
                          setOfficialPrInput(selectedPR.pr_no.includes("TEMP") ? "" : selectedPR.pr_no);
                          setShowOfficialPrModal(true);
                        }}
                        title="Manually input official university PR control number"
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors border border-stone-900 active:scale-98"
                      >
                        <FileCheck className="h-4 w-4 text-white" />
                        <span>{selectedPR.pr_no.includes("TEMP") ? "Input Official PR #" : "Edit Official PR #"}</span>
                      </button>
                    )}

                    {/* Stage Advancement */}
                    {nextStage(selectedPR) ? (
                      <button
                        onClick={() => openAction("complete")}
                        title={`Advance to Stage ${nextStage(selectedPR)?.number}: ${nextStage(selectedPR)?.label}`}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#7B0046] hover:bg-[#630038] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors border border-[#7B0046] active:scale-98"
                      >
                        <Check className="h-4 w-4 text-white" />
                        <span>Complete Stage {detailStage?.number || ""}</span>
                      </button>
                    ) : selectedPR.current_stage === "completed" ? (
                      <div className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-stone-100 text-stone-800 text-xs sm:text-sm font-semibold border border-stone-200">
                        <CheckCircle className="h-4 w-4 text-stone-600" />
                        <span>All Stages Completed</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Pre-Numbering Banner - Only displayed at Stage 4 if still Temporary Number */}
                {selectedPR.current_stage === "pr_pre_numbering" && selectedPR.pr_no.includes("TEMP") && (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-stone-200/70 text-stone-700 shrink-0 mt-0.5">
                      <AlertCircle className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-bold text-stone-900 text-xs sm:text-sm">Step 4 Pre-Numbering Pending: {selectedPR.pr_no}</p>
                        <button
                          onClick={() => {
                            setOfficialPrInput("");
                            setShowOfficialPrModal(true);
                          }}
                          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs"
                        >
                          Input Official PR #
                        </button>
                      </div>
                      <p className="text-stone-600 mt-1 leading-relaxed">
                        This Purchase Request was created with a temporary number. At <strong>Step 4 (Pre-Numbering and Control of PRs)</strong>, you manually input the official PR number. Once entered, the temporary PR number will update in both the end user&apos;s and admin&apos;s PR data.
                      </p>
                    </div>
                  </div>
                )}

                {/* Secondary Tools & Operations Bar */}
                <div className="admin-pr-secondary-actions flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-stone-100">
                  {/* Documentary & Communication Tools */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFullPrNo(selectedPR.pr_no)}
                      className="admin-pr-action-button inline-flex items-center justify-center gap-2 h-9 px-3 sm:px-3.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 shadow-2xs transition-all active:scale-98"
                    >
                      <FileText className="h-4 w-4 text-stone-600" />
                      <span>View Full PR Form</span>
                    </button>

                    {!["completed", "rejected", "cancelled"].includes(selectedPR.current_stage) && (
                      <button
                        onClick={() => openAction("remark")}
                        className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 shadow-2xs transition-all active:scale-98"
                      >
                        <MessageSquare className="h-4 w-4 text-stone-600" />
                        <span>Add Remark</span>
                      </button>
                    )}
                  </div>

                  {/* Governance & Exception Operations */}
                  <div className="flex items-center gap-2">
                    {!["completed", "rejected", "cancelled"].includes(selectedPR.current_stage) && (
                      <button
                        onClick={() => openAction("reject")}
                        className="admin-pr-action-button inline-flex items-center justify-center gap-2 h-9 px-3 sm:px-3.5 rounded-lg bg-white hover:bg-red-50 text-stone-600 hover:text-red-700 text-xs font-semibold border border-stone-200 hover:border-red-200 shadow-2xs transition-all active:scale-98"
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Reject PR</span>
                      </button>
                    )}

                    <button
                      onClick={() => setDeletePR(selectedPR.pr_no)}
                      className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg bg-white hover:bg-red-50 text-stone-600 hover:text-red-700 text-xs font-semibold border border-stone-200 hover:border-red-200 shadow-2xs transition-all active:scale-98"
                      title={`Permanently delete ${selectedPR.pr_no}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Current PMO Stage banner */}
              {detailStage && (
                <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-0.5">Current PMO Stage</p>
                  <p className="text-xs sm:text-sm font-bold text-stone-900">Stage {detailStage.number}: {detailStage.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{detailStage.description}</p>
                </div>
              )}

              {/* Procurement Progress */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900">Procurement Workflow Progress</h4>
                  </div>
                  <span className="text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-md">
                    {selectedPR.current_stage === "completed" ? "Completed" : detailIndex >= 0 ? `Stage ${detailIndex + 1}` : "—"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-[#7B0046] transition-all" style={{ width: `${detailPercent}%` }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[470px] overflow-y-auto pr-1">
                  {STAGES.map((stage, index) => {
                    const recorded = history.find((h) => h.stage_key === stage.key);
                    const isCurrent = selectedPR.current_stage === stage.key;
                    const isCompleted = selectedPR.current_stage === "completed" || (!isCurrent && detailIndex > index) || !!recorded;
                    const state = isCurrent ? "current" : isCompleted ? "completed" : "pending";
                    return (
                      <div
                        key={stage.key}
                        className={`rounded-xl border p-3 transition-colors ${
                          state === "current"
                            ? "border-stone-300 bg-stone-50 shadow-2xs ring-1 ring-stone-900/5"
                            : state === "completed"
                            ? "border-stone-200/80 bg-white"
                            : "border-stone-200/50 bg-stone-50/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              state === "current"
                                ? "bg-[#7B0046] text-white shadow-2xs"
                                : state === "completed"
                                ? "bg-stone-800 text-white"
                                : "bg-stone-150 text-stone-400 border border-stone-200/80"
                            }`}
                          >
                            {state === "completed" ? "✓" : stage.number}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase tracking-[.12em] font-bold text-stone-400">Stage {stage.number}</span>
                              <span
                                className={`text-[9px] font-bold ${
                                  state === "current" ? "text-[#7B0046]" : state === "completed" ? "text-stone-600" : "text-stone-400"
                                }`}
                              >
                                {state === "current" ? "CURRENT" : state === "completed" ? "COMPLETED" : "UPCOMING"}
                              </span>
                            </div>
                            <p className={`text-xs font-semibold mt-0.5 ${state === "current" ? "text-stone-900" : "text-stone-700"}`}>{stage.label}</p>
                            {recorded?.completed_at && (
                              <p className="text-[9px] text-stone-400 mt-1">Recorded {new Date(recorded.completed_at).toLocaleString("en-PH")}</p>
                            )}
                            {recorded?.remarks && <p className="text-[9px] text-stone-500 mt-1">{recorded.remarks}</p>}
                          </div>
                          {state === "current" && <ChevronRight className="h-4 w-4 text-stone-400 shrink-0 mt-1" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Purpose */}
              <div className="bg-stone-50/70 rounded-xl p-3.5 border border-stone-200/80">
                <p className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-1">Purpose</p>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{selectedPR.purpose || "N/A"}</p>
              </div>

              {/* Recorded Activity */}
              <div className="border border-stone-200 rounded-xl p-4 bg-white">
                <h4 className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-3">Recorded Activity</h4>
                {history.length ? (
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div key={`${h.stage_key}-${h.completed_at}-${i}`} className="border border-stone-200/80 rounded-lg p-3 bg-stone-50/30">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-semibold text-xs text-stone-800">{h.stage_name || LABELS[h.stage_key] || h.stage_key}</p>
                            <p className="text-[10px] text-stone-400 mt-1">{h.completed_at ? new Date(h.completed_at).toLocaleString("en-PH") : ""}</p>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-md font-semibold h-fit border ${
                              h.status === "rejected"
                                ? "bg-red-50 text-red-700 border-red-200/70"
                                : h.status === "remark"
                                ? "bg-stone-100 text-stone-700 border-stone-200"
                                : "bg-stone-100 text-stone-800 border-stone-200"
                            }`}
                          >
                            {h.status === "remark" ? "Remark" : h.status === "rejected" ? "Rejected" : "Recorded"}
                          </span>
                        </div>
                        {h.remarks && (
                          <div className="mt-2 bg-white border border-stone-200 border-l-2 border-l-[#7B0046] pl-3 py-1.5 text-[11px] text-stone-700 rounded-r-md">
                            <b className="text-stone-900">Note:</b> {h.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 text-center py-4">
                    No historical activity has been recorded yet. The procurement progress above is still calculated from the PR&apos;s current stage.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {action && selectedPR && (
        <div className="admin-pr-action-overlay fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 border border-stone-200">
            <div className="flex items-center justify-between gap-3 pb-3 mb-3.5 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action === "reject" ? "bg-red-50 text-red-600" : action === "remark" ? "bg-stone-100 text-stone-600" : "bg-[#7B0046]/10 text-[#7B0046]"}`}>
                  {action === "reject" ? <XCircle className="h-4.5 w-4.5" /> : action === "remark" ? <MessageSquare className="h-4.5 w-4.5" /> : <CheckCircle className="h-4.5 w-4.5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-stone-900 truncate">
                    {action === "complete" ? "Advance Stage" : action === "remark" ? "Send Remark" : "Reject Purchase Request"}
                  </h3>
                  <p className="text-[11px] text-stone-500 truncate font-mono">
                    {selectedPR.pr_no}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAction(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {action === "complete" && nextStage(selectedPR) && (
                <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                    <span className="text-stone-400 font-normal">Next:</span>
                    <span className="text-[#7B0046] font-bold">Stage {nextStage(selectedPR)?.number}:</span>
                    <span>{nextStage(selectedPR)?.label}</span>
                  </div>
                  {nextStage(selectedPR)?.description && (
                    <p className="text-[11px] text-stone-500 mt-1 leading-snug">{nextStage(selectedPR)?.description}</p>
                  )}
                </div>
              )}

              {/* Official PR Number Input for Step 4 Pre-Numbering - Only shown when completing Stage 4 */}
              {action === "complete" && selectedPR.current_stage === "pr_pre_numbering" && (
                <div className="border border-stone-200 rounded-xl p-3 bg-stone-50/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-stone-500" />
                      <span>Official PR Control Number</span>
                      {selectedPR.pr_no.includes("TEMP") && (
                        <span className="text-red-500 font-medium text-[11px]">*Required</span>
                      )}
                    </label>
                    <span className="text-[10px] font-semibold text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded-md">
                      Step 4
                    </span>
                  </div>
                  <input
                    type="text"
                    value={officialPrInput}
                    onChange={(e) => setOfficialPrInput(e.target.value.toUpperCase())}
                    placeholder="e.g. PR-2026-0001"
                    className="w-full h-9 px-3 rounded-lg border border-stone-300 bg-white font-mono text-xs font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#7B0046] focus:ring-1 focus:ring-[#7B0046]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {action === "complete" ? "Remarks / completion note" : "Reason / remark"}{" "}
                  {action !== "complete" ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-stone-400 font-normal text-[11px]">(Optional)</span>
                  )}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    action === "reject"
                      ? "Explain why this PR is being rejected..."
                      : action === "remark"
                      ? "Enter a procurement remark..."
                      : "Add a note for this stage (optional)..."
                  }
                  rows={2}
                  className="w-full min-h-[76px] rounded-lg border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 p-2.5 text-xs outline-none focus:border-[#7B0046] focus:ring-1 focus:ring-[#7B0046] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 mt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={busy}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitAction()}
                disabled={busy || (action !== "complete" && !remarks.trim())}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                  action === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : action === "remark"
                    ? "bg-stone-800 hover:bg-stone-900"
                    : "bg-[#7B0046] hover:bg-[#630038]"
                }`}
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{action === "complete" ? "Complete Stage" : action === "remark" ? "Send Remark" : "Reject PR"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Step 4: Official PR Number Assignment Modal */}
      {showOfficialPrModal && selectedPR && (
        <div className="admin-pr-official-overlay fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200">
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-[#7B0046]">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#4D002C]">Step 4: PR Pre-Numbering &amp; Control</h3>
                  <p className="text-xs text-stone-500">Assign official university PR control number</p>
                </div>
              </div>
              <button onClick={() => setShowOfficialPrModal(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs">
                <span className="text-stone-500 block font-semibold">Current PR Tracking Number:</span>
                <span className="font-mono font-black text-sm text-[#7B0046]">{selectedPR.pr_no}</span>
                {selectedPR.pr_no.includes("TEMP") && (
                  <span className="ml-2 inline-flex text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Temporary
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-stone-700 mb-1.5">
                  Official PR Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={officialPrInput}
                  onChange={(e) => setOfficialPrInput(e.target.value.toUpperCase())}
                  placeholder="e.g. PR-2026-0001"
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white font-mono text-sm font-black text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-stone-600 mb-1.5">
                  Logbook / Control Remarks <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Recorded in PMO PR control logbook Vol. 3, page 15..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => { setShowOfficialPrModal(false); setOfficialPrInput(""); }}
                disabled={busy}
                className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitOfficialPrAssignment()}
                disabled={busy || !officialPrInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7B0046] to-[#4D002C] text-white text-xs font-black flex items-center gap-2 hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin text-amber-300" />}
                <span>Assign &amp; Update PR Number</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePR && <div className="admin-pr-delete-overlay fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 border border-stone-200"><div className="flex items-start gap-3 mb-5"><div className="p-3 rounded-xl bg-red-50 text-red-600"><Trash2 className="h-6 w-6" /></div><div><h3 className="text-lg font-bold text-gray-900">Delete Purchase Request?</h3><p className="text-sm text-stone-600 mt-1"><b>{deletePR}</b> and its recorded stage history will be permanently removed.</p></div></div><div className="flex justify-end gap-2"><button onClick={() => setDeletePR(null)} className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-semibold">Cancel</button><button onClick={() => void deleteRequest()} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Permanently</button></div></div></div>}

      {fullPrNo && <AdminPRFullFormModal prNo={fullPrNo} onClose={() => setFullPrNo(null)} />}
      <ActionFeedbackModal open={feedback.open} tone={feedback.tone} title={feedback.title} message={feedback.message} onClose={() => setFeedback((f) => ({ ...f, open: false }))} actionLabel="Done" />
      <style jsx global>{`
        .admin-dashboard-page .admin-logout::before,
        .admin-dashboard-page .admin-logout::after,
        .admin-dashboard-page button[title="Logout"]::before,
        .admin-dashboard-page button[title="Logout"]::after,
        .admin-dashboard-page button[aria-label="Logout"]::before,
        .admin-dashboard-page button[aria-label="Logout"]::after {
          content: none !important;
          display: none !important;
        }
      `}</style>
    </div>
  );
}
