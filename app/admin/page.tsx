"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { ActionFeedbackModal, type FeedbackTone } from "@/components/ui/ActionFeedbackModal";
import RFQEditorModal from "@/components/RFQEditorModal";
import AdminPRFullFormModal from "@/components/AdminPRFullFormModal";
import {
  Check, CheckCircle, Clock, Eye, FileCheck, FileText, Loader2, LogOut,
  MessageSquare, RefreshCw, Search, Trash2, User, Users, X, XCircle,
  AlertCircle, ArrowRight, Sparkles, ChevronRight,
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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { router.replace("/auth/login"); return; }
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
      if (action === "complete") showFeedback("success", "Stage Completed Successfully", `${selectedPR.pr_no} has been advanced to ${nextInfo ? `Step ${nextInfo.number}: ${nextInfo.label}` : "the next stage"}.`);
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
      const deleted = deletePR; setDeletePR(null); await loadData(); showFeedback("success", "Purchase Request Deleted", `${deleted} and its recorded stage history have been permanently removed.`);
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
          <div className="flex items-center gap-3 min-w-0"><div className="bg-[#7C1D2E] p-2 rounded-xl text-[#D4A843] shrink-0"><FileText className="h-5 w-5" /></div><div className="min-w-0"><b className="block text-base sm:text-lg text-[#5A1420] truncate">MSU GenSan Procurement Management System</b><span className="text-[10px] sm:text-xs text-stone-500 font-semibold tracking-wide">ADMIN PORTAL</span></div></div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0"><span className="hidden lg:block text-xs text-stone-600"><User className="inline h-3.5 w-3.5 mr-1" />{user?.email}</span><button onClick={logout} title="Logout" aria-label="Logout" className="admin-logout inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-[#7C1D2E] hover:bg-red-50 text-xs font-bold transition-colors"><LogOut className="h-4 w-4" /><span>Logout</span></button></div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <div className="flex flex-col lg:flex-row justify-between gap-5 mb-7"><div><div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#9A7B2F] font-extrabold mb-2"><Sparkles className="h-3.5 w-3.5" /> Procurement Operations</div><h1 className="text-3xl font-extrabold tracking-tight text-[#5A1420]">Admin Dashboard</h1><p className="text-stone-600 mt-1 text-sm">Manage Purchase Requests through the official 20-step PMO procurement process.</p></div><div className="flex flex-wrap gap-2 items-start"><Link href="/admin/users" className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-[#7C1D2E] hover:bg-red-50 flex items-center gap-2"><Users className="h-4 w-4" /> User Approvals</Link><Link href="/admin/inquiries" className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-[#7C1D2E] hover:bg-red-50 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Inquiries</Link><button onClick={() => void manualRefresh()} disabled={refreshing} className="admin-refresh-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7C1D2E] border border-[#7C1D2E] rounded-xl text-sm font-bold text-white hover:bg-[#5A1420] disabled:opacity-60 disabled:cursor-wait shadow-sm transition-all"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /><span>{refreshing ? "Refreshing…" : "Refresh"}</span></button></div></div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-7">{[[stats.total, "Total PRs", FileCheck, "text-[#7C1D2E]"], [stats.pending, "In Progress", Clock, "text-amber-600"], [stats.inProgress, "Beyond Receipt", AlertCircle, "text-orange-600"], [stats.completed, "Completed", CheckCircle, "text-emerald-700"], [stats.rejected, "Rejected", XCircle, "text-red-600"]].map(([n, l, I, c]: any) => <div key={l} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-[0_5px_20px_rgba(45,20,10,0.035)]"><div className="flex justify-between items-center"><div><div className={`text-2xl font-bold ${c}`}>{n}</div><div className="text-xs font-semibold text-stone-600 mt-0.5">{l}</div></div><I className={`h-5 w-5 ${c}`} /></div></div>)}</div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-5 flex flex-col lg:flex-row gap-3 shadow-[0_5px_20px_rgba(45,20,10,0.03)]"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search PR number, purpose, or department" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E]" /></div><div className="flex flex-col sm:flex-row gap-3"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900"><option value="all">All Statuses</option>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.number}. {s.shortLabel}</option>)}<option value="completed">Completed</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select><select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-gray-900"><option value="all">All Departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select></div></div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-[0_8px_30px_rgba(45,20,10,0.04)]"><div className="px-5 py-4 border-b border-stone-200 flex justify-between items-center"><div><h2 className="font-bold text-[#5A1420]">Purchase Requests</h2><p className="text-xs text-stone-500 mt-1">Workflow stages are enforced in order; administrators cannot skip steps.</p></div><span className="text-xs bg-stone-100 px-2.5 py-1 rounded-full font-bold text-stone-700">{filtered.length}</span></div>{filtered.length === 0 ? <div className="p-12 text-center text-stone-500">No purchase requests found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1120px] admin-pr-table"><thead className="bg-stone-50"><tr>{["PR #", "Purpose", "Department", "Amount", "Current Status", "Date", "Actions"].map((h) => <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wide text-stone-500 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-stone-100">{filtered.map((pr) => {
          const stepInfo = currentStage(pr); const nxt = nextStage(pr); const stageNumber = stepInfo?.number || 0;
          const rfqMode: RfqMode | null = pr.current_stage === "rfq_generation" ? "generation" : pr.current_stage === "rfq_evaluation" ? "evaluation" : pr.current_stage === "rfq_printing" ? "printing" : null;
          return <tr key={pr.pr_no} className={`hover:bg-stone-50/70 transition-colors ${rfqMode ? "bg-orange-50/25" : ""}`}>
            <td className="px-5 py-4 text-sm font-bold text-[#7C1D2E] whitespace-nowrap">{pr.pr_no}{rfqMode && <span className="ml-2 inline-flex align-middle px-1.5 py-0.5 rounded-full bg-[#7C1D2E] text-white text-[9px] font-extrabold tracking-wide">RFQ</span>}</td>
            <td className="px-5 py-4 text-sm max-w-xs truncate">{pr.purpose}</td><td className="px-5 py-4 text-sm text-stone-600">{pr.department}</td><td className="px-5 py-4 text-sm font-medium whitespace-nowrap">₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${COLORS[pr.current_stage] || "bg-gray-100 text-gray-600"}`}>{stageNumber ? `Step ${stageNumber}: ` : ""}{LABELS[pr.current_stage] || pr.current_stage}</span></td>
            <td className="px-5 py-4 text-sm text-stone-500 whitespace-nowrap">{pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-PH") : "—"}</td>
            <td className="px-4 py-3"><div className="admin-pr-actions">
              {rfqMode && <button onClick={() => void openRfq(pr, rfqMode)} title={`${rfqMode === "generation" ? "Generate" : rfqMode === "evaluation" ? "Review" : "Print"} RFQ for ${pr.pr_no}`} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#7C1D2E] hover:bg-[#5A1420] text-white border border-[#7C1D2E] text-xs font-extrabold shadow-sm hover:shadow-md transition-all"><FileText className="h-3.5 w-3.5 text-[#D4A843]" /><span>{rfqMode === "generation" ? "Generate RFQ" : rfqMode === "evaluation" ? "Review RFQ" : "Print RFQ"}</span></button>}
              <button onClick={() => setFullPrNo(pr.pr_no)} title="View complete submitted PR form" className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-stone-50 text-[#7C1D2E] border border-stone-300 text-xs font-extrabold transition-all"><FileText className="h-3.5 w-3.5" /> <span>Full PR</span></button>
              {nxt && <button onClick={() => openAction("complete", pr)} title={`Complete Step ${nxt.number}: ${nxt.label}`} className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#7C1D2E] border border-amber-200 text-xs font-bold transition-all"><Check className="h-3.5 w-3.5 text-[#D4A843]" /> <span>Complete Next</span></button>}
              <button onClick={() => void openDetails(pr)} title="View workflow details" aria-label={`View workflow details for ${pr.pr_no}`} className="admin-pr-icon-button"><Eye className="h-4 w-4" /></button>
              <button onClick={() => setDeletePR(pr.pr_no)} title="Delete PR" aria-label={`Delete ${pr.pr_no}`} className="admin-pr-icon-button admin-pr-delete"><Trash2 className="h-4 w-4" /></button>
            </div></td>
          </tr>;
        })}</tbody></table></div>}</div>
      </main>

      {showDetails && selectedPR && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex justify-between items-start z-10 shrink-0"><div><h3 className="text-xl font-extrabold text-[#5A1420]">PR {selectedPR.pr_no}</h3><p className="text-sm text-stone-500 mt-1">{selectedPR.department} · ₱{Number(selectedPR.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><button onClick={() => setShowDetails(false)} aria-label="Close PR details" className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"><X className="h-5 w-5" /></button></div>
        <div className="overflow-y-auto p-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5 p-4 bg-stone-50 rounded-xl border border-stone-200"><div><p className="text-[10px] uppercase tracking-[.14em] text-stone-400 font-extrabold">Current Stage</p><div className="flex flex-wrap items-center gap-2 mt-1"><span className={`px-3 py-1.5 rounded-full text-xs font-extrabold ${COLORS[selectedPR.current_stage] || "bg-gray-100"}`}>{detailStage ? `Step ${detailStage.number}: ${detailStage.shortLabel}` : LABELS[selectedPR.current_stage] || selectedPR.current_stage}</span>{detailStage && <span className="text-xs text-stone-500 font-semibold">Step {detailStage.number} of 20</span>}</div></div><div className="flex gap-2 flex-wrap items-center">
            {selectedPR.current_stage === "rfq_generation" && <button onClick={() => void openRfq(selectedPR, "generation")} className="px-3.5 py-2 bg-[#7C1D2E] text-white rounded-xl text-xs font-bold flex gap-1.5 items-center shadow-sm hover:bg-[#5A1420]"><FileText className="h-4 w-4 text-[#D4A843]" /> Generate RFQ</button>}
            {selectedPR.current_stage === "rfq_evaluation" && <button onClick={() => void openRfq(selectedPR, "evaluation")} className="px-3.5 py-2 bg-[#7C1D2E] text-white rounded-xl text-xs font-bold flex gap-1.5 items-center shadow-sm hover:bg-[#5A1420]"><FileText className="h-4 w-4 text-[#D4A843]" /> Review RFQ</button>}
            {selectedPR.current_stage === "rfq_printing" && <button onClick={() => void openRfq(selectedPR, "printing")} className="px-3.5 py-2 bg-[#7C1D2E] text-white rounded-xl text-xs font-bold flex gap-1.5 items-center shadow-sm hover:bg-[#5A1420]"><FileText className="h-4 w-4 text-[#D4A843]" /> Print RFQ</button>}
            <button onClick={() => setFullPrNo(selectedPR.pr_no)} className="px-3.5 py-2 bg-white border border-[#7C1D2E]/30 text-[#7C1D2E] rounded-xl text-xs font-bold flex gap-1.5 items-center hover:bg-red-50"><FileText className="h-4 w-4" /> View Submitted PR</button>
            {nextStage(selectedPR) && <button onClick={() => openAction("complete")} className="px-3.5 py-2 bg-white border border-[#D4A843] text-[#7C1D2E] rounded-xl text-xs font-bold flex gap-1.5 items-center hover:bg-amber-50"><Check className="h-4 w-4 text-[#D4A843]" /> Complete Next Stage</button>}
            {["completed", "rejected", "cancelled"].includes(selectedPR.current_stage) ? null : <><button onClick={() => openAction("remark")} className="px-3 py-2 bg-white border border-[#7C1D2E]/30 text-[#7C1D2E] rounded-xl text-xs font-bold flex gap-1 items-center hover:bg-red-50"><MessageSquare className="h-4 w-4" /> Remark</button><button onClick={() => openAction("reject")} className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex gap-1 items-center hover:bg-red-100"><XCircle className="h-4 w-4" /> Reject</button></>}
          </div></div>

          {detailStage && <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-5"><p className="text-[10px] uppercase tracking-wide text-amber-800 font-extrabold mb-1">Current PMO Step</p><p className="text-sm font-extrabold text-stone-900">Step {detailStage.number}: {detailStage.label}</p><p className="text-xs text-stone-600 mt-1">{detailStage.description}</p></div>}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-5 shadow-sm"><div className="flex items-center justify-between gap-3 mb-3"><div><h4 className="text-sm font-extrabold text-[#5A1420]">20-Step Procurement Progress</h4><p className="text-xs text-stone-500">The current step is always shown, even when no historical completion row has been recorded yet.</p></div><span className="text-xs font-extrabold text-[#7C1D2E] bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">{selectedPR.current_stage === "completed" ? "20 / 20" : detailIndex >= 0 ? `${detailIndex + 1} / 20` : "— / 20"}</span></div><div className="h-2 rounded-full bg-stone-100 overflow-hidden mb-4"><div className="h-full rounded-full bg-gradient-to-r from-[#7C1D2E] to-[#D4A843]" style={{ width: `${detailPercent}%` }} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[470px] overflow-y-auto pr-1">{STAGES.map((stage, index) => {
            const recorded = history.find((h) => h.stage_key === stage.key);
            const isCurrent = selectedPR.current_stage === stage.key;
            const isCompleted = selectedPR.current_stage === "completed" || (!isCurrent && detailIndex > index) || !!recorded;
            const state = isCurrent ? "current" : isCompleted ? "completed" : "pending";
            return <div key={stage.key} className={`rounded-xl border p-3 ${state === "current" ? "border-[#D4A843] bg-amber-50 shadow-sm" : state === "completed" ? "border-emerald-100 bg-emerald-50/50" : "border-stone-200 bg-stone-50/40"}`}><div className="flex items-start gap-3"><div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${state === "current" ? "bg-[#7C1D2E] text-white" : state === "completed" ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-600"}`}>{state === "completed" ? "✓" : stage.number}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[9px] uppercase tracking-[.12em] font-black text-stone-400">Step {stage.number}</span><span className={`text-[9px] font-black ${state === "current" ? "text-[#7C1D2E]" : state === "completed" ? "text-emerald-700" : "text-stone-400"}`}>{state === "current" ? "CURRENT" : state === "completed" ? "COMPLETED" : "UPCOMING"}</span></div><p className={`text-xs font-bold mt-0.5 ${state === "current" ? "text-[#5A1420]" : "text-stone-700"}`}>{stage.label}</p>{recorded?.completed_at && <p className="text-[9px] text-stone-400 mt-1">Recorded {new Date(recorded.completed_at).toLocaleString("en-PH")}</p>}{recorded?.remarks && <p className="text-[9px] text-stone-500 mt-1">{recorded.remarks}</p>}</div>{state === "current" && <ChevronRight className="h-4 w-4 text-[#D4A843] shrink-0 mt-1" />}</div></div>;
          })}</div></div>

          <div className="bg-stone-50 rounded-xl p-4 mb-5 border border-stone-200"><p className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-1">Purpose</p><p className="text-sm text-stone-700">{selectedPR.purpose || "N/A"}</p></div>
          <div className="border border-stone-200 rounded-xl p-4"><h4 className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-3">Recorded Activity</h4>{history.length ? <div className="space-y-2">{history.map((h, i) => <div key={`${h.stage_key}-${h.completed_at}-${i}`} className="border border-stone-200 rounded-lg p-3 bg-white"><div className="flex justify-between gap-3"><div><p className="font-semibold text-xs text-stone-800">{h.stage_name || LABELS[h.stage_key] || h.stage_key}</p><p className="text-[10px] text-stone-400 mt-1">{h.completed_at ? new Date(h.completed_at).toLocaleString("en-PH") : ""}</p></div><span className={`text-[9px] px-2 py-1 rounded-full font-bold h-fit ${h.status === "rejected" ? "bg-red-100 text-red-700" : h.status === "remark" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{h.status === "remark" ? "Remark" : h.status === "rejected" ? "Rejected" : "Recorded"}</span></div>{h.remarks && <div className="mt-2 bg-stone-50 border-l-4 border-[#D4A843] pl-3 py-1.5 text-[10px] text-stone-700 rounded-r-md"><b className="text-stone-900">Note:</b> {h.remarks}</div>}</div>)}</div> : <p className="text-xs text-stone-400 text-center py-4">No historical activity has been recorded yet. The 20-step progress above is still calculated from the PR's current stage.</p>}</div>
        </div>
      </div></div>}

      {action && selectedPR && <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200"><div className="flex items-start gap-3 mb-5"><div className={`p-3 rounded-xl ${action === "reject" ? "bg-red-100 text-red-700" : action === "remark" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{action === "reject" ? <XCircle className="h-6 w-6" /> : action === "remark" ? <MessageSquare className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}</div><div className="flex-1"><h3 className="text-lg font-bold text-gray-900">{action === "complete" ? "Complete Next Stage" : action === "remark" ? "Send Remark" : "Reject Purchase Request"}</h3><p className="text-xs text-stone-500 mt-1 font-medium">{selectedPR.pr_no}{action === "complete" && nextStage(selectedPR) ? ` · Step ${nextStage(selectedPR)?.number}: ${nextStage(selectedPR)?.label}` : ""}</p></div><button onClick={() => setAction(null)} className="p-1 text-stone-400 hover:text-stone-600"><X className="h-5 w-5" /></button></div>{action === "complete" && nextStage(selectedPR) && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5"><div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1"><span>Advancing Step</span><ArrowRight className="h-3.5 w-3.5" /><span>Step {nextStage(selectedPR)?.number}: {nextStage(selectedPR)?.label}</span></div><p className="text-xs text-emerald-700">{nextStage(selectedPR)?.description}</p></div>}<label className="block text-xs font-bold text-stone-600 uppercase tracking-wide mb-2">{action === "complete" ? "Remarks / completion note" : "Reason / remark"} {action !== "complete" && <span className="text-red-500">*</span>}</label><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={action === "reject" ? "Explain why this PR is being rejected..." : action === "remark" ? "Enter a procurement remark..." : "Add a note for this stage (optional)..."} className="w-full min-h-[110px] rounded-xl border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 p-3 text-sm outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E] resize-y" /><div className="flex justify-end gap-2.5 mt-5"><button onClick={() => setAction(null)} disabled={busy} className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200">Cancel</button><button onClick={() => void submitAction()} disabled={busy || (action !== "complete" && !remarks.trim())} className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 ${action === "reject" ? "bg-red-600 hover:bg-red-700" : action === "remark" ? "bg-[#7C1D2E] hover:bg-[#5A1420]" : "bg-gradient-to-r from-[#7C1D2E] to-[#91191C]"}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{action === "complete" ? "Complete Stage" : action === "remark" ? "Send Remark" : "Reject PR"}</button></div></div></div>}

      {deletePR && <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200"><div className="flex items-start gap-3 mb-5"><div className="p-3 rounded-xl bg-red-50 text-red-600"><Trash2 className="h-6 w-6" /></div><div><h3 className="text-lg font-bold text-gray-900">Delete Purchase Request?</h3><p className="text-sm text-stone-600 mt-1"><b>{deletePR}</b> and its recorded stage history will be permanently removed.</p></div></div><div className="flex justify-end gap-2"><button onClick={() => setDeletePR(null)} className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-semibold">Cancel</button><button onClick={() => void deleteRequest()} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Permanently</button></div></div></div>}

      {rfq && <RFQEditorModal prNo={rfq.prNo} mode={rfq.mode} onClose={() => setRfq(null)} onSaved={() => { void loadData(); }} />}
      {fullPrNo && <AdminPRFullFormModal prNo={fullPrNo} onClose={() => setFullPrNo(null)} />}
      <ActionFeedbackModal open={feedback.open} tone={feedback.tone} title={feedback.title} message={feedback.message} onClose={() => setFeedback((f) => ({ ...f, open: false }))} actionLabel="Done" />
      <style jsx global>{`
        .admin-dashboard-page .admin-pr-table { table-layout: fixed; width: 100%; min-width: 1120px; }
        .admin-dashboard-page .admin-pr-table th,
        .admin-dashboard-page .admin-pr-table td { vertical-align: middle; }
        .admin-dashboard-page .admin-pr-table th:nth-child(1) { width: 14%; }
        .admin-dashboard-page .admin-pr-table th:nth-child(2) { width: 22%; }
        .admin-dashboard-page .admin-pr-table th:nth-child(3) { width: 11%; }
        .admin-dashboard-page .admin-pr-table th:nth-child(4) { width: 10%; }
        .admin-dashboard-page .admin-pr-table th:nth-child(5) { width: 17%; }
        .admin-dashboard-page .admin-pr-table th:nth-child(6) { width: 9%; }
        .admin-dashboard-page .admin-pr-table th:nth-child(7) { width: 17%; text-align: center; }
        .admin-dashboard-page .admin-pr-table td:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .admin-dashboard-page .admin-pr-table td:last-child { padding: 12px 14px; }
        .admin-dashboard-page .admin-pr-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 38px 38px;
          gap: 8px;
          align-items: stretch;
          width: 100%;
          max-width: 330px;
          margin: 0 auto;
        }
        .admin-dashboard-page .admin-pr-actions > button {
          min-width: 0;
          min-height: 40px;
          width: 100%;
          margin: 0;
          white-space: normal;
          line-height: 1.15;
        }
        .admin-dashboard-page .admin-pr-actions > button[title*="RFQ"] {
          grid-column: 1 / span 2;
        }
        .admin-dashboard-page .admin-pr-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px !important;
          min-width: 38px !important;
          padding: 0 !important;
          border-radius: 10px;
          border: 1px solid #E7DED5;
          background: #fff;
          color: #7C1D2E;
          transition: background-color .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
        }
        .admin-dashboard-page .admin-pr-icon-button:hover { background: #FFF7F5; border-color: #D7BDB7; transform: translateY(-1px); }
        .admin-dashboard-page .admin-pr-delete { color: #DC5A5A; border-color: #F1D8D8; }
        .admin-dashboard-page .admin-pr-delete:hover { color: #B91C1C; background: #FFF1F1; border-color: #EAB4B4; }
        .admin-dashboard-page .admin-logout::before,
        .admin-dashboard-page .admin-logout::after,
        .admin-dashboard-page button[title="Logout"]::before,
        .admin-dashboard-page button[title="Logout"]::after,
        .admin-dashboard-page button[aria-label="Logout"]::before,
        .admin-dashboard-page button[aria-label="Logout"]::after { content: none !important; display: none !important; }
        @media (max-width: 900px) {
          .admin-dashboard-page .admin-pr-table { min-width: 1080px; }
          .admin-dashboard-page .admin-pr-actions { max-width: 300px; gap: 6px; }
          .admin-dashboard-page .admin-pr-actions > button { min-height: 38px; font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
