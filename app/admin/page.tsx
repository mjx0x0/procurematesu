"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { ActionFeedbackModal, type FeedbackTone } from "@/components/ui/ActionFeedbackModal";
import {
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
  XCircle,
  AlertCircle,
  ArrowRight,
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
}

interface StageHistory {
  stage_name: string;
  stage_key: string;
  completed_at: string;
  remarks?: string;
  status?: string;
}

const STAGES = PROCUREMENT_STAGES;
const LABELS: Record<string, string> = {
  ...PROCUREMENT_STAGE_LABELS,
  draft: "Draft",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const COLORS: Record<string, string> = {
  receipt_of_pr: "bg-amber-100 text-amber-700",
  ppmp_app_verification: "bg-yellow-100 text-yellow-700",
  pmo_director_validation: "bg-blue-100 text-blue-700",
  pr_pre_numbering: "bg-indigo-100 text-indigo-700",
  budget_endorsement: "bg-purple-100 text-purple-700",
  approved_pr_received: "bg-violet-100 text-violet-700",
  rfq_generation: "bg-orange-100 text-orange-700",
  rfq_evaluation: "bg-orange-100 text-orange-700",
  rfq_printing: "bg-pink-100 text-pink-700",
  philgeps_posting: "bg-pink-100 text-pink-700",
  aoq_preparation: "bg-cyan-100 text-cyan-700",
  aoq_evaluation: "bg-cyan-100 text-cyan-700",
  awarded_aoq_received: "bg-teal-100 text-teal-700",
  po_generation_evaluation: "bg-teal-100 text-teal-700",
  pmo_director_po_validation: "bg-emerald-100 text-emerald-700",
  budget_po_endorsement: "bg-emerald-100 text-emerald-700",
  approved_po_received: "bg-green-100 text-green-700",
  po_release_supplier: "bg-green-100 text-green-700",
  spmo_endorsement: "bg-lime-100 text-lime-700",
  monitoring_documentation: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [action, setAction] = useState<"complete" | "remark" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletePR, setDeletePR] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    tone: FeedbackTone;
    title: string;
    message: string;
  }>({ open: false, tone: "success", title: "", message: "" });

  const selectedPRRef = useRef<PR | null>(null);
  selectedPRRef.current = selectedPR;

  const showFeedback = (tone: FeedbackTone, title: string, message: string) =>
    setFeedback({ open: true, tone, title, message });

  const loadData = async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load PRs:", error);
      return;
    }
    setPrs((data || []) as PR[]);
  };

  const loadHistory = async (prNo: string) => {
    const { data, error } = await supabase
      .from("pr_stages_completed")
      .select("stage_name,stage_key,completed_at,remarks,status")
      .eq("pr_no", prNo)
      .order("completed_at", { ascending: true });
    if (error) {
      console.error("Failed to load stage history:", error);
      setHistory([]);
    } else {
      setHistory((data || []) as StageHistory[]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.replace("/auth/login");
          return;
        }
        const { data: profile } = await supabase
          .from("users")
          .select("role,is_active")
          .eq("id", authUser.id)
          .single();
        if (profile?.role !== "admin" || profile?.is_active === false) {
          router.replace("/dashboard");
          return;
        }
        setUser(authUser);
        await loadData();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Real-time Database Sync for Seamless Stage Updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-live-procurement-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_requests" },
        (payload) => {
          loadData();
          if (
            selectedPRRef.current &&
            payload.new &&
            (payload.new as any).pr_no === selectedPRRef.current.pr_no
          ) {
            setSelectedPR(payload.new as PR);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pr_stages_completed" },
        (payload) => {
          if (
            selectedPRRef.current &&
            payload.new &&
            (payload.new as any).pr_no === selectedPRRef.current.pr_no
          ) {
            loadHistory(selectedPRRef.current.pr_no);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(
    () =>
      prs.filter((p) => {
        const q = searchTerm.toLowerCase();
        return (
          (!q ||
            p.pr_no.toLowerCase().includes(q) ||
            p.purpose?.toLowerCase().includes(q) ||
            p.department?.toLowerCase().includes(q)) &&
          (statusFilter === "all" || p.current_stage === statusFilter) &&
          (departmentFilter === "all" || p.department === departmentFilter)
        );
      }),
    [prs, searchTerm, statusFilter, departmentFilter]
  );

  const departments = useMemo(
    () => [...new Set(prs.map((p) => p.department).filter(Boolean))],
    [prs]
  );

  const stats = useMemo(
    () => ({
      total: prs.length,
      pending: prs.filter(
        (p) =>
          p.current_stage !== "completed" &&
          !["rejected", "cancelled"].includes(p.current_stage)
      ).length,
      inProgress: prs.filter(
        (p) =>
          !["receipt_of_pr", "completed", "rejected", "cancelled"].includes(
            p.current_stage
          )
      ).length,
      completed: prs.filter((p) => p.current_stage === "completed").length,
      rejected: prs.filter((p) => ["rejected", "cancelled"].includes(p.current_stage)).length,
    }),
    [prs]
  );

  const openDetails = async (pr: PR) => {
    setSelectedPR(pr);
    await loadHistory(pr.pr_no);
    setShowDetails(true);
  };

  const nextStage = (pr: PR) => {
    const i = STAGES.findIndex((s) => s.key === pr.current_stage);
    return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
  };

  const openAction = (type: "complete" | "remark" | "reject", targetPR?: PR) => {
    if (targetPR) {
      setSelectedPR(targetPR);
    }
    setAction(type);
    setRemarks("");
  };

  const submitAction = async () => {
    if (!selectedPR || !action || busy) return;

    if ((action === "remark" || action === "reject") && !remarks.trim()) {
      showFeedback("warning", "Remark Required", "Please provide a remark before continuing.");
      return;
    }

    if (action === "complete" && !nextStage(selectedPR)) {
      showFeedback("info", "Process Complete", "This purchase request has already reached the final stage.");
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
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");

      // 1. Close the action window immediately so the updated state is front and center
      setAction(null);
      setRemarks("");

      // 2. Seamlessly update local states with the fresh database records returned by the API
      if (result.updatedPR) {
        setSelectedPR(result.updatedPR);
        setPrs((prev) =>
          prev.map((p) => (p.pr_no === result.updatedPR.pr_no ? result.updatedPR : p))
        );
      }
      if (result.stageHistory) {
        setHistory(result.stageHistory);
      }

      // 3. Trigger full table and stats reload from the database
      loadData();

      // 4. Show success notification
      const nextStepInfo =
        action === "complete" && result.newStatus
          ? STAGES.find((s) => s.key === result.newStatus)
          : null;

      if (action === "complete") {
        showFeedback(
          "success",
          "Stage Completed Successfully",
          `${selectedPR.pr_no} has been advanced to Step ${nextStepInfo?.number || ""}: ${
            nextStepInfo?.label || LABELS[result.newStatus || ""]
          }. The database records have been seamlessly updated.`
        );
      } else if (action === "remark") {
        showFeedback(
          "success",
          "Remark Sent",
          `Your procurement remark for ${selectedPR.pr_no} has been recorded into the database.`
        );
      } else {
        showFeedback(
          "success",
          "Purchase Request Rejected",
          `${selectedPR.pr_no} has been marked as rejected with your recorded reason.`
        );
      }
    } catch (e: any) {
      console.error(e);
      showFeedback(
        "error",
        "Action Failed",
        e.message || "Unable to complete the requested action. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async () => {
    if (!deletePR) return;
    try {
      const { error: itemsError } = await supabase
        .from("pr_items")
        .delete()
        .eq("pr_no", deletePR);
      if (itemsError) throw itemsError;

      const { error: historyError } = await supabase
        .from("pr_stages_completed")
        .delete()
        .eq("pr_no", deletePR);
      if (historyError) throw historyError;

      const { error } = await supabase
        .from("purchase_requests")
        .delete()
        .eq("pr_no", deletePR);
      if (error) throw error;

      const deleted = deletePR;
      setDeletePR(null);
      await loadData();
      showFeedback(
        "success",
        "Purchase Request Deleted",
        `${deleted} and its recorded stage history have been permanently removed.`
      );
    } catch (e) {
      console.error(e);
      showFeedback(
        "error",
        "Delete Failed",
        "The purchase request could not be deleted. Please try again."
      );
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
        <Loader2 className="h-10 w-10 animate-spin text-[#7C1D2E]" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800">
      {/* Top Navigation */}
      <nav className="bg-white/95 border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#7C1D2E] p-2 rounded-xl text-[#D4A843]">
              <FileText className="h-5 w-5" />
            </div>
            <b className="text-xl text-[#5A1420]">
              Procuremate<span className="text-[#D4A843]">SU</span>
            </b>
            <span className="text-xs bg-red-50 text-[#7C1D2E] border border-red-200 px-2 py-1 rounded-full font-semibold">
              Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-stone-600">
              <User className="inline h-3.5 w-3.5 mr-1" />
              {user?.email}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 text-stone-500 hover:text-red-700"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-7">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-7">
          <div>
            <h1 className="text-3xl font-extrabold text-[#5A1420]">Admin Dashboard</h1>
            <p className="text-stone-600 mt-1">
              Manage Purchase Requests through the official 20-step PMO procurement process.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/inquiries"
              className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-[#7C1D2E] hover:bg-red-50 flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" /> Inquiries
            </Link>
            <button
              onClick={() => loadData()}
              className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-stone-50"
            >
              <RefreshCw className="h-4 w-4 text-[#7C1D2E]" /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-7">
          {[
            [stats.total, "Total PRs", FileCheck, "text-[#7C1D2E]"],
            [stats.pending, "In Progress", Clock, "text-amber-600"],
            [stats.inProgress, "Beyond Receipt", AlertCircle, "text-orange-600"],
            [stats.completed, "Completed", CheckCircle, "text-emerald-700"],
            [stats.rejected, "Rejected", XCircle, "text-red-600"],
          ].map(([n, l, I, c]: any) => (
            <div key={l} className="bg-white rounded-xl p-4 border border-stone-200">
              <div className="flex justify-between items-center">
                <div>
                  <div className={`text-2xl font-bold ${c}`}>{n}</div>
                  <div className="text-xs font-semibold text-stone-600">{l}</div>
                </div>
                <I className={`h-5 w-5 ${c}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-5 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search PR number, purpose, or department"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E]"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-gray-900"
            >
              <option value="all">All Statuses</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.number}. {s.shortLabel}
                </option>
              ))}
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-gray-900"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Purchase Requests Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-[#5A1420]">Purchase Requests</h2>
              <p className="text-xs text-stone-500 mt-1">
                Workflow stages are enforced in order; administrators cannot skip steps.
              </p>
            </div>
            <span className="text-xs bg-stone-100 px-2.5 py-1 rounded-full font-bold text-stone-700">
              {filtered.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-stone-500">No purchase requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50">
                  <tr>
                    {["PR #", "Purpose", "Department", "Amount", "Current Status", "Date", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs uppercase tracking-wide text-stone-500 font-semibold"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((pr) => {
                    const stepInfo = STAGES.find((s) => s.key === pr.current_stage);
                    const nxt = nextStage(pr);
                    return (
                      <tr key={pr.pr_no} className="hover:bg-stone-50/70 transition-colors">
                        <td className="px-5 py-4 text-sm font-bold text-[#7C1D2E] whitespace-nowrap">
                          {pr.pr_no}
                        </td>
                        <td className="px-5 py-4 text-sm max-w-xs truncate">{pr.purpose}</td>
                        <td className="px-5 py-4 text-sm text-stone-600">{pr.department}</td>
                        <td className="px-5 py-4 text-sm font-medium whitespace-nowrap">
                          ₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              COLORS[pr.current_stage] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {stepInfo?.number ? `Step ${stepInfo.number}: ` : ""}
                            {LABELS[pr.current_stage] || pr.current_stage}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-500 whitespace-nowrap">
                          {new Date(pr.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex justify-end gap-1.5 items-center">
                            {nxt && (
                              <button
                                onClick={() => openAction("complete", pr)}
                                title={`Complete Step ${nxt.number}: ${nxt.label}`}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#7C1D2E] border border-amber-200 text-xs font-bold flex items-center gap-1 transition-all"
                              >
                                <Check className="h-3.5 w-3.5 text-[#D4A843]" />
                                Complete Next
                              </button>
                            )}
                            <button
                              onClick={() => openDetails(pr)}
                              title="View / manage details"
                              className="p-2 rounded-lg text-[#7C1D2E] hover:bg-red-50 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletePR(pr.pr_no)}
                              title="Delete PR"
                              className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* PR Details Modal (z-50) */}
      {showDetails && selectedPR && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          style={{ zIndex: 50 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 p-5 flex justify-between items-start z-10">
              <div>
                <h3 className="text-xl font-bold text-[#5A1420]">PR {selectedPR.pr_no}</h3>
                <p className="text-sm text-stone-500 mt-1">
                  {selectedPR.department} · ₱
                  {Number(selectedPR.total || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 p-4 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-400 font-semibold">
                    Current Stage
                  </p>
                  <span
                    className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                      COLORS[selectedPR.current_stage] || "bg-gray-100"
                    }`}
                  >
                    {LABELS[selectedPR.current_stage] || selectedPR.current_stage}
                  </span>
                  {selectedPR.current_stage !== "rejected" &&
                    selectedPR.current_stage !== "cancelled" && (
                      <p className="text-xs text-stone-500 mt-1 font-medium">
                        {STAGES.find((s) => s.key === selectedPR.current_stage)?.number
                          ? `Step ${
                              STAGES.find((s) => s.key === selectedPR.current_stage)?.number
                            } of 20 in PMO Sequence`
                          : "Workflow status"}
                      </p>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  {nextStage(selectedPR) && (
                    <button
                      onClick={() => openAction("complete")}
                      className="px-3.5 py-2 bg-gradient-to-r from-[#7C1D2E] to-[#91191C] text-white rounded-xl text-xs font-bold flex gap-1.5 items-center shadow-sm hover:from-[#5A1420] hover:to-[#7C1D2E] transition-all"
                    >
                      <Check className="h-4 w-4 text-[#D4A843]" /> Complete Next Stage
                    </button>
                  )}
                  {!["completed", "rejected", "cancelled"].includes(selectedPR.current_stage) && (
                    <>
                      <button
                        onClick={() => openAction("remark")}
                        className="px-3 py-2 bg-white border border-[#7C1D2E]/30 text-[#7C1D2E] rounded-xl text-xs font-bold flex gap-1 items-center hover:bg-red-50 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" /> Remark
                      </button>
                      <button
                        onClick={() => openAction("reject")}
                        className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex gap-1 items-center hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {selectedPR.current_stage !== "rejected" &&
                selectedPR.current_stage !== "cancelled" && (
                  <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 mb-5">
                    <p className="text-xs uppercase tracking-wide text-amber-800 font-bold mb-1">
                      Current PMO Step
                    </p>
                    <p className="text-sm font-bold text-stone-900">
                      Step {STAGES.find((s) => s.key === selectedPR.current_stage)?.number}:{" "}
                      {STAGES.find((s) => s.key === selectedPR.current_stage)?.label}
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      {STAGES.find((s) => s.key === selectedPR.current_stage)?.description}
                    </p>
                  </div>
                )}

              <div className="bg-stone-50 rounded-xl p-4 mb-5 border border-stone-200">
                <p className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-1">
                  Purpose
                </p>
                <p className="text-sm text-stone-700">{selectedPR.purpose || "N/A"}</p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wide text-stone-400 font-semibold mb-3">
                  Recorded Stage Timeline
                </h4>
                <div className="space-y-3">
                  {history.length ? (
                    history.map((h, i) => (
                      <div
                        key={`${h.stage_key}-${h.completed_at}-${i}`}
                        className="border border-stone-200 rounded-xl p-4 bg-white shadow-xs"
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm text-stone-800">{h.stage_name}</p>
                            <p className="text-xs text-stone-400 mt-1">
                              {new Date(h.completed_at).toLocaleString("en-PH")}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold h-fit ${
                              h.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : h.status === "remark"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {h.status === "remark"
                              ? "Remark"
                              : h.status === "rejected"
                              ? "Rejected"
                              : "Recorded"}
                          </span>
                        </div>
                        {h.remarks && (
                          <div className="mt-3 bg-stone-50 border-l-4 border-[#D4A843] pl-3 py-1.5 text-xs text-stone-700 rounded-r-md">
                            <b className="text-stone-900">Note:</b> {h.remarks}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-stone-400 text-center py-6">
                      No stage history recorded yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Window: Pops up strictly on top (z-60) without needing to close the details window */}
      {action && selectedPR && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          style={{ zIndex: 60 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 mb-5">
              <div
                className={`p-3 rounded-xl ${
                  action === "reject"
                    ? "bg-red-100 text-red-700"
                    : action === "remark"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {action === "reject" ? (
                  <XCircle className="h-6 w-6" />
                ) : action === "remark" ? (
                  <MessageSquare className="h-6 w-6" />
                ) : (
                  <CheckCircle className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {action === "complete"
                    ? "Complete Next Stage"
                    : action === "remark"
                    ? "Send Remark"
                    : "Reject Purchase Request"}
                </h3>
                <p className="text-xs text-stone-500 mt-1 font-medium">
                  {selectedPR.pr_no}
                  {action === "complete" && nextStage(selectedPR)
                    ? ` · Step ${nextStage(selectedPR)?.number}: ${nextStage(selectedPR)?.label}`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setAction(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {action === "complete" && nextStage(selectedPR) && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                  <span>Advancing Step</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>
                    Step {nextStage(selectedPR)?.number}: {nextStage(selectedPR)?.label}
                  </span>
                </div>
                <p className="text-xs text-emerald-700">
                  {nextStage(selectedPR)?.description}
                </p>
              </div>
            )}

            {action === "remark" && (
              <p className="text-sm text-stone-600 mb-4">
                This records a remark without changing the PR stage. Use this when documents are
                incomplete or the end user needs to provide additional information.
              </p>
            )}

            {action === "reject" && (
              <p className="text-sm text-stone-600 mb-4">
                Rejecting the PR stops the normal workflow and makes the rejection reason visible to
                the end user.
              </p>
            )}

            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide mb-2">
              {action === "complete" ? "Remarks / completion note" : "Reason / remark"}{" "}
              {action !== "complete" ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-stone-400 font-normal lowercase">(optional)</span>
              )}
            </label>

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                action === "reject"
                  ? "Explain why this PR is being rejected..."
                  : action === "remark"
                  ? "e.g. Please attach the missing quotation / supplier document..."
                  : "Add a note for this stage (optional)..."
              }
              className="w-full min-h-[110px] rounded-xl border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 p-3 text-sm outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E] resize-y"
            />

            <div className="flex justify-end gap-2.5 mt-5">
              <button
                onClick={() => setAction(null)}
                disabled={busy}
                className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={busy || (action !== "complete" && !remarks.trim())}
                className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all ${
                  action === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : action === "remark"
                    ? "bg-[#7C1D2E] hover:bg-[#5A1420]"
                    : "bg-gradient-to-r from-[#7C1D2E] to-[#91191C] hover:from-[#5A1420] hover:to-[#7C1D2E] shadow-sm"
                }`}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {action === "complete"
                  ? "Complete Stage"
                  : action === "remark"
                  ? "Send Remark"
                  : "Reject PR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (z-70) */}
      {deletePR && (
        <div
          className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          style={{ zIndex: 70 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200">
            <div className="flex items-start gap-3 mb-5">
              <div className="p-3 rounded-xl bg-red-50 text-red-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Purchase Request?</h3>
                <p className="text-sm text-stone-600 mt-1">
                  <b>{deletePR}</b> and its recorded stage history will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletePR(null)}
                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={deleteRequest}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Feedback Modal (z-100) */}
      <ActionFeedbackModal
        open={feedback.open}
        tone={feedback.tone}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
        actionLabel="Done"
      />
    </div>
  );
}

