"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { ActionFeedbackModal, type FeedbackTone } from "@/components/ui/ActionFeedbackModal";
import RFQEditorModal from "@/components/RFQEditorModal";
import AdminPRFullFormModal from "@/components/AdminPRFullFormModal";
import { MsuLogo } from "@/components/msu-logo";
import {
  Check, CheckCircle, Clock, Eye, FileCheck, FileText, Loader2, LogOut,
  MessageSquare, RefreshCw, Search, Trash2, User, Users, X, XCircle,
  AlertCircle, ArrowRight, Sparkles, ChevronRight, ChevronDown,
} from "lucide-react";

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
type RfqMode = "generation" | "evaluation" | "printing";

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
  const [user, setUser] = useState<any>(null);
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
  const [rfq, setRfq] = useState<{ prNo: string; mode: RfqMode } | null>(null);
  const [action, setAction] = useState<"complete" | "remark" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletePR, setDeletePR] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; tone: FeedbackTone; title: string; message: string }>({ open: false, tone: "success", title: "", message: "" });
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
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
        setUser(authUser);
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

  const filtered = useMemo(() => prs.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    return (!q || p.pr_no.toLowerCase().includes(q) || String(p.purpose || "").toLowerCase().includes(q) || String(p.department || "").toLowerCase().includes(q)) &&
      (statusFilter === "all" || p.current_stage === statusFilter) && (departmentFilter === "all" || p.department === departmentFilter);
  }), [prs, searchTerm, statusFilter, departmentFilter]);
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
  const openAction = (type: "complete" | "remark" | "reject", targetPR?: PR) => { if (targetPR) setSelectedPR(targetPR); setAction(type); setRemarks(""); };
  const openRfq = async (pr: PR, mode: RfqMode) => {
    if (mode === "generation") {
      const response = await fetch("/api/admin/rfq", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prNo: pr.pr_no }) });
      const result = await response.json();
      if (!response.ok) { showFeedback("error", "RFQ Preparation Failed", result.error || "Unable to prepare the RFQ."); return; }
    }
    setRfq({ prNo: pr.pr_no, mode });
  };

  const submitAction = async () => {
    if (!selectedPR || !action || busy) return;
    if ((action === "remark" || action === "reject") && !remarks.trim()) { showFeedback("warning", "Remark Required", "Please provide a remark before continuing."); return; }
    if (action === "complete" && !nextStage(selectedPR)) { showFeedback("info", "Process Complete", "This purchase request has already reached the final stage."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/complete-stage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prNo: selectedPR.pr_no, action, newStatus: action === "complete" ? nextStage(selectedPR)?.key : undefined, remarks: remarks.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      setAction(null); setRemarks("");
      if (result.updatedPR) { setSelectedPR(result.updatedPR); setPrs((prev) => prev.map((p) => p.pr_no === result.updatedPR.pr_no ? result.updatedPR : p)); }
      if (result.stageHistory) setHistory(result.stageHistory);
      void loadData();
      const nextInfo = action === "complete" && result.newStatus ? STAGES.find((s) => s.key === result.newStatus) : null;
      if (action === "complete") showFeedback("success", "Stage Completed Successfully", `${selectedPR.pr_no} has been advanced to ${nextInfo ? `Stage ${nextInfo.number}: ${nextInfo.label}` : "the next stage"}.`);
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
  const logout = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]"><Loader2 className="h-10 w-10 animate-spin text-[#7C1D2E]" /></div>;

  const detailStage = currentStage(selectedPR);
  const detailIndex = currentIndex(selectedPR);
  const detailPercent = selectedPR?.current_stage === "completed" ? 100 : detailIndex >= 0 ? Math.round(((detailIndex + 1) / 20) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800 admin-dashboard-page">
      <nav className="bg-white/95 border-b border-stone-200 sticky top-0 z-40 shadow-[0_1px_12px_rgba(45,20,10,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0"><MsuLogo size={40} className="shrink-0" /><div className="min-w-0"><b className="block text-base sm:text-lg text-[#5A1420] truncate">MSU GenSan Procurement Management System</b><span className="text-[10px] sm:text-xs text-stone-500 font-semibold tracking-wide">ADMIN PORTAL</span></div></div>
          <div ref={adminMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAdminMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 transition hover:bg-stone-50 hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 cursor-pointer"
              aria-expanded={adminMenuOpen}
              aria-label="Admin account menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7C1D2E]/10 text-[10px] font-bold text-[#7C1D2E]">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline font-medium text-xs max-w-[170px] truncate text-stone-800">
                {user?.email}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${adminMenuOpen ? "rotate-180 text-[#7C1D2E]" : ""}`} />
            </button>

            {adminMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(45,25,20,0.12)]">
                <div className="border-b border-stone-100 px-3 py-2.5">
                  <p className="truncate text-xs font-bold text-stone-900">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-[#7C1D2E] border border-red-200/60">
                      Administrator
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <div className="flex flex-col lg:flex-row justify-between gap-5 mb-7"><div><div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#9A7B2F] font-extrabold mb-2"><Sparkles className="h-3.5 w-3.5" /> Procurement Operations</div><h1 className="text-3xl font-extrabold tracking-tight text-[#5A1420]">Admin Dashboard</h1><p className="text-stone-600 mt-1 text-sm">Manage Purchase Requests through the official university PMO procurement workflow.</p></div><div className="flex flex-wrap gap-2 items-start"><Link href="/admin/users" className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-[#7C1D2E] hover:bg-red-50 flex items-center gap-2"><Users className="h-4 w-4" /> User Approvals</Link><Link href="/admin/inquiries" className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-[#7C1D2E] hover:bg-red-50 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Inquiries</Link><button onClick={() => void manualRefresh()} disabled={refreshing} className="admin-refresh-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C1D2E] border border-[#7C1D2E] rounded-xl text-sm font-bold text-white hover:bg-[#5A1420] disabled:opacity-60 disabled:cursor-wait shadow-sm transition-all"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /><span>{refreshing ? "Refreshing…" : "Refresh"}</span></button></div></div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-7">{[[stats.total, "Total PRs", FileCheck, "text-[#7C1D2E]"], [stats.pending, "In Progress", Clock, "text-amber-600"], [stats.inProgress, "Beyond Receipt", AlertCircle, "text-orange-600"], [stats.completed, "Completed", CheckCircle, "text-emerald-700"], [stats.rejected, "Rejected", XCircle, "text-red-600"]].map(([n, l, I, c]: any) => <div key={l} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-[0_5px_20px_rgba(45,20,10,0.035)]"><div className="flex justify-between items-center"><div><div className={`text-2xl font-bold ${c}`}>{n}</div><div className="text-xs font-semibold text-stone-600 mt-0.5">{l}</div></div><I className={`h-5 w-5 ${c}`} /></div></div>)}</div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-5 shadow-[0_5px_20px_rgba(45,20,10,0.03)] flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by PR number, purpose, or requesting department..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E] text-sm"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E]"
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
              className="px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {(searchTerm || statusFilter !== "all" || departmentFilter !== "all") && (
              <button
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); setDepartmentFilter("all"); }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 whitespace-nowrap transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Purchase Requests Table Card */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_8px_30px_rgba(45,20,10,0.04)]">
          <div className="px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#5A1420]">Purchase Requests</h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">Workflow stages are enforced sequentially in accordance with PMO procurement rules.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-xs sm:text-sm font-bold text-stone-700 w-fit">
              <span className="h-2 w-2 rounded-full bg-[#7C1D2E]" />
              {filtered.length} {filtered.length === 1 ? "Record" : "Records"}
            </span>
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
                      <th className="w-[14%] lg:w-[13%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">PR #</th>
                      <th className="w-[24%] lg:w-[23%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Purpose</th>
                      <th className="w-[16%] lg:w-[15%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Department</th>
                      <th className="w-[15%] lg:w-[13%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Amount</th>
                      <th className="w-[19%] lg:w-[17%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Current Status</th>
                      <th className="hidden lg:table-cell lg:w-[10%] px-3 lg:px-4 py-3.5 text-left text-xs uppercase tracking-wider font-bold">Date</th>
                      <th className="w-[12%] lg:w-[9%] px-3 lg:px-4 py-3.5 text-right text-xs uppercase tracking-wider font-bold pr-4 lg:pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((pr) => {
                      const stepInfo = currentStage(pr);
                      const stageNumber = stepInfo?.number || 0;
                      const rfqMode: RfqMode | null = pr.current_stage === "rfq_generation" ? "generation" : pr.current_stage === "rfq_evaluation" ? "evaluation" : pr.current_stage === "rfq_printing" ? "printing" : null;
                      return (
                        <tr
                          key={pr.pr_no}
                          onClick={() => void openDetails(pr)}
                          className={`hover:bg-[#FFFDF7] transition-colors cursor-pointer ${rfqMode ? "bg-amber-50/25" : ""}`}
                        >
                          <td className="px-3 lg:px-4 py-3.5 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-xs lg:text-sm font-extrabold text-[#7C1D2E] tracking-tight">{pr.pr_no}</span>
                              {rfqMode && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[#8B6009] text-[9px] font-black tracking-wider uppercase shrink-0">
                                  RFQ
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
                              className="inline-flex items-center gap-1 h-7.5 px-2.5 lg:px-3 rounded-lg lg:rounded-xl bg-white hover:bg-stone-50 text-[#7C1D2E] text-xs font-bold border border-stone-200 hover:border-[#7C1D2E]/40 transition-all shadow-2xs hover:shadow-xs active:scale-95"
                            >
                              <Eye className="h-3.5 w-3.5 text-[#7C1D2E]" />
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
                  const rfqMode: RfqMode | null = pr.current_stage === "rfq_generation" ? "generation" : pr.current_stage === "rfq_evaluation" ? "evaluation" : pr.current_stage === "rfq_printing" ? "printing" : null;
                  return (
                    <div
                      key={pr.pr_no}
                      onClick={() => void openDetails(pr)}
                      className={`p-4 hover:bg-[#FFFDF7] transition-colors cursor-pointer flex flex-col gap-2.5 ${rfqMode ? "bg-amber-50/25" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-sm font-extrabold text-[#7C1D2E] tracking-tight">{pr.pr_no}</span>
                          {rfqMode && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[#8B6009] text-[9px] font-black uppercase">
                              RFQ
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-sm font-bold text-stone-900 shrink-0">
                          ₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-stone-800 line-clamp-1">{pr.purpose || "Official procurement request"}</p>

                      <div className="flex items-center justify-between gap-2 text-xs text-stone-500 font-medium">
                        <span className="truncate">{pr.department || "University Office"}</span>
                        <span className="shrink-0">{pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "—"}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border truncate max-w-[220px] ${COLORS[pr.current_stage] || "bg-stone-100 text-stone-700 border-stone-200"}`}>
                          <span className="truncate">{stageNumber ? `Stage ${stageNumber}: ` : ""}{LABELS[pr.current_stage] || pr.current_stage}</span>
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); void openDetails(pr); }}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-white text-[#7C1D2E] text-xs font-bold border border-stone-200 shadow-2xs hover:bg-stone-50"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col border border-stone-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-start z-10 shrink-0 shadow-2xs">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-extrabold text-[#5A1420] tracking-tight">PR {selectedPR.pr_no}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${COLORS[selectedPR.current_stage] || "bg-stone-100 text-stone-700 border-stone-200"}`}>
                    {detailStage ? `Stage ${detailStage.number}: ${detailStage.shortLabel}` : LABELS[selectedPR.current_stage] || selectedPR.current_stage}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Procurement Actions & Workflow Controls Card */}
              <div className="bg-[#FAF7F2] rounded-2xl border border-stone-200 p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-200/80">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#5A1420]">Workflow Actions & Management</h4>
                    <p className="text-xs text-stone-500 mt-0.5">Execute stage advancement, evaluate RFQs, inspect submitted forms, or record remarks.</p>
                  </div>
                  <div className="text-xs font-bold text-stone-600 bg-white px-3 py-1 rounded-lg border border-stone-200 shrink-0">
                    {detailStage ? `Stage ${detailStage.number}: ${detailStage.label}` : LABELS[selectedPR.current_stage] || selectedPR.current_stage}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* RFQ Action buttons */}
                  {selectedPR.current_stage === "rfq_generation" && (
                    <button
                      onClick={() => void openRfq(selectedPR, "generation")}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-[#7C1D2E] to-[#5A1420] hover:from-[#650709] hover:to-[#4D0C0D] text-white text-xs sm:text-sm font-bold shadow-sm transition-all border border-[#7C1D2E] active:scale-98"
                    >
                      <FileText className="h-4 w-4 text-[#F0C83F]" />
                      <span>Generate Official RFQ</span>
                    </button>
                  )}
                  {selectedPR.current_stage === "rfq_evaluation" && (
                    <button
                      onClick={() => void openRfq(selectedPR, "evaluation")}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-[#7C1D2E] to-[#5A1420] hover:from-[#650709] hover:to-[#4D0C0D] text-white text-xs sm:text-sm font-bold shadow-sm transition-all border border-[#7C1D2E] active:scale-98"
                    >
                      <FileText className="h-4 w-4 text-[#F0C83F]" />
                      <span>Review & Evaluate RFQ</span>
                    </button>
                  )}
                  {selectedPR.current_stage === "rfq_printing" && (
                    <button
                      onClick={() => void openRfq(selectedPR, "printing")}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-[#7C1D2E] to-[#5A1420] hover:from-[#650709] hover:to-[#4D0C0D] text-white text-xs sm:text-sm font-bold shadow-sm transition-all border border-[#7C1D2E] active:scale-98"
                    >
                      <FileText className="h-4 w-4 text-[#F0C83F]" />
                      <span>Print RFQ (3-4 Copies)</span>
                    </button>
                  )}

                  {/* Stage Advancement */}
                  {nextStage(selectedPR) ? (
                    <button
                      onClick={() => openAction("complete")}
                      title={`Advance to Stage ${nextStage(selectedPR)?.number}: ${nextStage(selectedPR)?.label}`}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#FFFDF7] hover:bg-[#FFF8E6] text-[#7C1D2E] text-xs sm:text-sm font-bold border-2 border-[#D4AF37] shadow-sm transition-all active:scale-98"
                    >
                      <Check className="h-4 w-4 text-[#B88E13]" />
                      <span>Stage {nextStage(selectedPR)?.number} · Complete Stage</span>
                    </button>
                  ) : selectedPR.current_stage === "completed" ? (
                    <div className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-200">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Procurement Completed — All Stages Finished</span>
                    </div>
                  ) : null}

                  {/* Full Submitted PR View */}
                  <button
                    onClick={() => setFullPrNo(selectedPR.pr_no)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-bold border border-stone-200 transition-colors shadow-2xs active:scale-98"
                  >
                    <FileText className="h-4 w-4 text-[#7C1D2E]" />
                    <span>View Submitted PR</span>
                  </button>

                  {/* Remarks and Reject (if not final) */}
                  {!["completed", "rejected", "cancelled"].includes(selectedPR.current_stage) && (
                    <>
                      <button
                        onClick={() => openAction("remark")}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-bold border border-stone-200 transition-colors shadow-2xs active:scale-98"
                      >
                        <MessageSquare className="h-4 w-4 text-amber-600" />
                        <span>Add Remark</span>
                      </button>
                      <button
                        onClick={() => openAction("reject")}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs sm:text-sm font-bold border border-red-200 transition-colors active:scale-98"
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Reject PR</span>
                      </button>
                    </>
                  )}

                  {/* Delete PR Button */}
                  <button
                    onClick={() => setDeletePR(selectedPR.pr_no)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white hover:bg-red-50 text-red-600 text-xs sm:text-sm font-bold border border-red-200 transition-colors sm:ml-auto active:scale-98"
                    title={`Permanently delete ${selectedPR.pr_no}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <span>Delete PR</span>
                  </button>
                </div>
              </div>

              {/* Current PMO Stage banner */}
              {detailStage && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wide text-amber-800 font-extrabold mb-1">Current PMO Stage</p>
                  <p className="text-sm font-extrabold text-stone-900">Stage {detailStage.number}: {detailStage.label}</p>
                  <p className="text-xs text-stone-600 mt-1">{detailStage.description}</p>
                </div>
              )}

              {/* Procurement Progress */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#5A1420]">Procurement Workflow Progress</h4>
                    <p className="text-xs text-stone-500">The current stage is always shown, even when no historical completion row has been recorded yet.</p>
                  </div>
                  <span className="text-xs font-extrabold text-[#7C1D2E] bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                    {selectedPR.current_stage === "completed" ? "Completed" : detailIndex >= 0 ? `Stage ${detailIndex + 1}` : "—"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#7C1D2E] to-[#D4A843]" style={{ width: `${detailPercent}%` }} />
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
                        className={`rounded-xl border p-3 ${
                          state === "current"
                            ? "border-[#D4AF37] bg-amber-50 shadow-sm"
                            : state === "completed"
                            ? "border-emerald-100 bg-emerald-50/50"
                            : "border-stone-200 bg-stone-50/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${
                              state === "current"
                                ? "bg-[#7C1D2E] text-white"
                                : state === "completed"
                                ? "bg-emerald-600 text-white"
                                : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {state === "completed" ? "✓" : stage.number}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase tracking-[.12em] font-black text-stone-400">Stage {stage.number}</span>
                              <span
                                className={`text-[9px] font-black ${
                                  state === "current" ? "text-[#7C1D2E]" : state === "completed" ? "text-emerald-700" : "text-stone-400"
                                }`}
                              >
                                {state === "current" ? "CURRENT" : state === "completed" ? "COMPLETED" : "UPCOMING"}
                              </span>
                            </div>
                            <p className={`text-xs font-bold mt-0.5 ${state === "current" ? "text-[#5A1420]" : "text-stone-700"}`}>{stage.label}</p>
                            {recorded?.completed_at && (
                              <p className="text-[9px] text-stone-400 mt-1">Recorded {new Date(recorded.completed_at).toLocaleString("en-PH")}</p>
                            )}
                            {recorded?.remarks && <p className="text-[9px] text-stone-500 mt-1">{recorded.remarks}</p>}
                          </div>
                          {state === "current" && <ChevronRight className="h-4 w-4 text-[#D4A843] shrink-0 mt-1" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Purpose */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <p className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-1">Purpose</p>
                <p className="text-sm text-stone-700">{selectedPR.purpose || "N/A"}</p>
              </div>

              {/* Recorded Activity */}
              <div className="border border-stone-200 rounded-xl p-4">
                <h4 className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-3">Recorded Activity</h4>
                {history.length ? (
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div key={`${h.stage_key}-${h.completed_at}-${i}`} className="border border-stone-200 rounded-lg p-3 bg-white">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-semibold text-xs text-stone-800">{h.stage_name || LABELS[h.stage_key] || h.stage_key}</p>
                            <p className="text-[10px] text-stone-400 mt-1">{h.completed_at ? new Date(h.completed_at).toLocaleString("en-PH") : ""}</p>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-1 rounded-full font-bold h-fit ${
                              h.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : h.status === "remark"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {h.status === "remark" ? "Remark" : h.status === "rejected" ? "Rejected" : "Recorded"}
                          </span>
                        </div>
                        {h.remarks && (
                          <div className="mt-2 bg-stone-50 border-l-4 border-[#D4A843] pl-3 py-1.5 text-[10px] text-stone-700 rounded-r-md">
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

      {action && selectedPR && <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200"><div className="flex items-start gap-3 mb-5"><div className={`p-3 rounded-xl ${action === "reject" ? "bg-red-100 text-red-700" : action === "remark" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{action === "reject" ? <XCircle className="h-6 w-6" /> : action === "remark" ? <MessageSquare className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}</div><div className="flex-1"><h3 className="text-lg font-bold text-gray-900">{action === "complete" ? "Complete Next Stage" : action === "remark" ? "Send Remark" : "Reject Purchase Request"}</h3><p className="text-xs text-stone-500 mt-1 font-medium">{selectedPR.pr_no}{action === "complete" && nextStage(selectedPR) ? ` · Stage ${nextStage(selectedPR)?.number}: ${nextStage(selectedPR)?.label}` : ""}</p></div><button onClick={() => setAction(null)} className="p-1 text-stone-400 hover:text-stone-600"><X className="h-5 w-5" /></button></div>{action === "complete" && nextStage(selectedPR) && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5"><div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1"><span>Advancing Stage</span><ArrowRight className="h-3.5 w-3.5" /><span>Stage ${nextStage(selectedPR)?.number}: ${nextStage(selectedPR)?.label}</span></div><p className="text-xs text-emerald-700">{nextStage(selectedPR)?.description}</p></div>}<label className="block text-xs font-bold text-stone-600 uppercase tracking-wide mb-2">{action === "complete" ? "Remarks / completion note" : "Reason / remark"} {action !== "complete" && <span className="text-red-500">*</span>}</label><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={action === "reject" ? "Explain why this PR is being rejected..." : action === "remark" ? "Enter a procurement remark..." : "Add a note for this stage (optional)..."} className="w-full min-h-[110px] rounded-xl border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 p-3 text-sm outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E] resize-y" /><div className="flex justify-end gap-2.5 mt-5"><button onClick={() => setAction(null)} disabled={busy} className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200">Cancel</button><button onClick={() => void submitAction()} disabled={busy || (action !== "complete" && !remarks.trim())} className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 ${action === "reject" ? "bg-red-600 hover:bg-red-700" : action === "remark" ? "bg-[#7C1D2E] hover:bg-[#5A1420]" : "bg-gradient-to-r from-[#7C1D2E] to-[#91191C]"}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{action === "complete" ? "Complete Stage" : action === "remark" ? "Send Remark" : "Reject PR"}</button></div></div></div>}

      {deletePR && <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200"><div className="flex items-start gap-3 mb-5"><div className="p-3 rounded-xl bg-red-50 text-red-600"><Trash2 className="h-6 w-6" /></div><div><h3 className="text-lg font-bold text-gray-900">Delete Purchase Request?</h3><p className="text-sm text-stone-600 mt-1"><b>{deletePR}</b> and its recorded stage history will be permanently removed.</p></div></div><div className="flex justify-end gap-2"><button onClick={() => setDeletePR(null)} className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-semibold">Cancel</button><button onClick={() => void deleteRequest()} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Permanently</button></div></div></div>}

      {rfq && <RFQEditorModal prNo={rfq.prNo} mode={rfq.mode} onClose={() => setRfq(null)} onSaved={() => { void loadData(); }} />}
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
