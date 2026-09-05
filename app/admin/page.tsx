"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  FileText,
  LogOut,
  User,
  FileCheck,
  Clock,
  Loader2,
  Eye,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  X,
  MessageSquare,
  Check,
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
}

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

// ============================================================
// STAGE DEFINITION – matches the images exactly
// ============================================================
const STAGES = [
  { key: "pending", label: "PR Submission" },
  { key: "budget_office", label: "Budget Clearance" },
  { key: "chancellor_approval", label: "Chancellor Approval" },
  { key: "procurement_processing", label: "RFQ Generation" },
  { key: "canvassing", label: "Abstract of Quotations" },
  { key: "for_award", label: "BAC Endorsement" },
  { key: "po_issued", label: "PO Issued" },
  { key: "completed", label: "Completed" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [filteredPrs, setFilteredPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // State for Stage Completion Modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageToComplete, setStageToComplete] = useState<string | null>(null);
  const [stageRemarks, setStageRemarks] = useState("");
  const [stageHistory, setStageHistory] = useState<StageHistory[]>([]);

  // Check admin role and load data
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userData?.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setUser(user);
        await loadData();
      } catch (err) {
        console.error("Admin check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  const loadData = async () => {
    try {
      const { data: prsData, error: prsError } = await supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (prsError) throw prsError;

      setPrs(prsData || []);
      setFilteredPrs(prsData || []);

      const prList = (prsData as PR[]) || [];
      const total = prList.length;
      const pending = prList.filter((p: PR) => p.current_stage === "draft" || p.current_stage === "pending").length;
      const in_progress = prList.filter((p: PR) =>
        p.current_stage !== "draft" &&
        p.current_stage !== "pending" &&
        p.current_stage !== "completed" &&
        p.current_stage !== "cancelled"
      ).length;
      const completed = prList.filter((p: PR) => p.current_stage === "completed").length;
      const cancelled = prList.filter((p: PR) => p.current_stage === "cancelled").length;

      setStats({ total, pending, in_progress, completed, cancelled });
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  useEffect(() => {
    let filtered = [...prs];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.pr_no?.toLowerCase().includes(term) ||
        p.purpose?.toLowerCase().includes(term) ||
        p.department?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.current_stage === statusFilter);
    }
    if (departmentFilter !== "all") {
      filtered = filtered.filter(p => p.department === departmentFilter);
    }
    setFilteredPrs(filtered);
  }, [searchTerm, statusFilter, departmentFilter, prs]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      pending: "bg-yellow-100 text-yellow-600",
      for_approval: "bg-blue-100 text-blue-600",
      budget_office: "bg-purple-100 text-purple-600",
      chancellor_approval: "bg-indigo-100 text-indigo-600",
      procurement_processing: "bg-orange-100 text-orange-600",
      canvassing: "bg-pink-100 text-pink-600",
      bidding: "bg-cyan-100 text-cyan-600",
      for_award: "bg-teal-100 text-teal-600",
      po_issued: "bg-emerald-100 text-emerald-600",
      completed: "bg-green-100 text-green-600",
      cancelled: "bg-red-100 text-red-600",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      pending: "Pending",
      for_approval: "For Approval",
      budget_office: "Budget Office",
      chancellor_approval: "Chancellor Approval",
      procurement_processing: "Processing",
      canvassing: "Canvassing",
      bidding: "Bidding",
      for_award: "For Award",
      po_issued: "PO Issued",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const loadStageHistory = async (prNo: string) => {
    const { data, error } = await supabase
      .from("pr_stages_completed")
      .select("*")
      .eq("pr_no", prNo)
      .order("completed_at", { ascending: true });

    if (!error && data) {
      setStageHistory(data as StageHistory[]);
    } else {
      setStageHistory([]);
    }
  };

  const handleViewDetails = async (pr: PR) => {
    setSelectedPR(pr);
    await loadStageHistory(pr.pr_no);
    setShowDetailModal(true);
  };

  // ✅ FIX: Get the NEXT stage to complete, not the current one
  const getNextPendingStage = (pr: PR) => {
    const currentIndex = STAGES.findIndex(s => s.key === pr.current_stage);
    if (currentIndex >= STAGES.length - 1) return null;
    return STAGES[currentIndex + 1];
  };

  const handleOpenStageModal = (stageKey: string) => {
    setStageToComplete(stageKey);
    setStageRemarks("");
    setShowStageModal(true);
  };

  const handleCompleteStage = async () => {
    if (!selectedPR || !stageToComplete) return;
    if (updatingStatus) return;

    if (!stageRemarks.trim()) {
      alert("Please add a remark/note for this stage completion.");
      return;
    }

    setUpdatingStatus(true);

    try {
      const newStatus = stageToComplete;

      // 1. Update PR status
      const { error: updateError } = await supabase
        .from("purchase_requests")
        .update({
          current_stage: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("pr_no", selectedPR.pr_no);

      if (updateError) throw updateError;

      // 2. Insert into stage history with remarks
      const { error: historyError } = await supabase
        .from("pr_stages_completed")
        .insert({
          pr_no: selectedPR.pr_no,
          stage_name: getStatusLabel(newStatus),
          stage_key: newStatus,
          completed_at: new Date().toISOString(),
          remarks: stageRemarks.trim(),
        });

      if (historyError) throw historyError;

      // 3. Reload data
      await loadData();
      await loadStageHistory(selectedPR.pr_no);

      // 4. Update selected PR with new stage
      setSelectedPR({
        ...selectedPR,
        current_stage: newStatus,
      });

      setShowStageModal(false);
      setStageToComplete(null);
      setStageRemarks("");
    } catch (err: any) {
      console.error("❌ Stage update error DETAILS:", err);
      // Show the actual error message in the alert for debugging
      alert(`Failed to complete stage. Error: ${err.message || err}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeletePR = async (prNo: string) => {
    if (!confirm(`Are you sure you want to delete PR ${prNo}? This action cannot be undone.`)) {
      return;
    }

    try {
      await supabase.from("pr_items").delete().eq("pr_no", prNo);
      await supabase.from("pr_stages_completed").delete().eq("pr_no", prNo);

      const { error } = await supabase
        .from("purchase_requests")
        .delete()
        .eq("pr_no", prNo);

      if (error) throw error;

      await loadData();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete PR. Please try again.");
    }
  };

  const uniqueDepartments = [...new Set(prs.map(p => p.department).filter(Boolean))];

  const getStageStatus = (stageKey: string, pr: PR) => {
    const isCompleted = stageHistory.some(h => h.stage_key === stageKey);
    if (isCompleted) return "completed";
    const currentIndex = STAGES.findIndex(s => s.key === pr.current_stage);
    const stageIndex = STAGES.findIndex(s => s.key === stageKey);
    if (stageIndex === currentIndex) return "current";
    if (stageIndex < currentIndex) return "completed";
    return "pending";
  };

  const isTerminal = (pr: PR) => {
    return pr.current_stage === "completed" || pr.current_stage === "cancelled";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#7C1D2E] mx-auto" />
          <p className="mt-4 text-stone-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F4]">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#7C1D2E] p-2 rounded-xl text-[#D4A843] border border-[#D4A843]/30 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl text-[#5A1420]">
              Procuremate<span className="text-[#D4A843]">SU</span>
            </span>
            <span className="text-xs bg-red-100 text-[#7C1D2E] font-bold px-2.5 py-0.5 rounded-full border border-red-200">
              Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-600 hidden sm:inline font-medium">
              <User className="h-3.5 w-3.5 inline mr-1 text-[#7C1D2E]" />
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-stone-500 hover:text-red-700 transition-colors p-1"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#5A1420]">Admin Dashboard</h1>
            <p className="text-stone-600 mt-1">MSU-GenSan Purchase Requests &amp; Modality Oversight</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-50 transition-colors flex items-center gap-2 border border-stone-300 text-sm font-medium shadow-2xs"
          >
            <RefreshCw className="h-4 w-4 text-[#7C1D2E]" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200/90">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-[#7C1D2E]">{stats.total}</div>
                <div className="text-xs font-semibold text-stone-600">Total PRs</div>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <FileCheck className="h-5 w-5 text-[#7C1D2E]" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200/90">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <div className="text-xs font-semibold text-stone-600">Pending</div>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200/90">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.in_progress}</div>
                <div className="text-xs font-semibold text-stone-600">In Progress</div>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200/90">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-700">{stats.completed}</div>
                <div className="text-xs font-semibold text-stone-600">Completed</div>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200/90">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-stone-600">{stats.cancelled}</div>
                <div className="text-xs font-semibold text-stone-600">Cancelled</div>
              </div>
              <div className="p-2 bg-stone-100 rounded-lg">
                <XCircle className="h-5 w-5 text-stone-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Monitor Inquiries Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-200/90 text-center col-span-2 sm:col-span-3 lg:col-span-5 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 bg-red-50 text-[#7C1D2E] rounded-xl">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#5A1420]">Monitor Chatbot Inquiries</h3>
              <p className="text-xs text-stone-600">Review faculty &amp; staff inquiries to Isko BidDo regarding procurement rules &amp; PR tracking.</p>
            </div>
          </div>
          <Link
            href="/admin/inquiries"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#7C1D2E] to-[#8B1D30] hover:from-[#5A1420] hover:to-[#7C1D2E] text-white rounded-xl text-xs font-semibold transition-all shadow-2xs border border-[#D4A843]/30"
          >
            <span>View Inquiries</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200/90 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by PR number, purpose, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#7C1D2E] focus:border-transparent outline-none transition-all bg-white"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#7C1D2E] focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="all">All Statuses</option>
                  {STAGES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#7C1D2E] focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* PR Table */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200/90 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#7C1D2E]" />
              <h2 className="text-base font-bold text-[#5A1420]">Purchase Requests</h2>
              <span className="text-xs bg-stone-200 px-2 py-0.5 rounded-full font-semibold text-stone-700">({filteredPrs.length})</span>
            </div>
          </div>

          {filteredPrs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No purchase requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PR #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPrs.map((pr) => (
                    <tr key={pr.pr_no} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{pr.pr_no}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{pr.purpose}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{pr.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₱{pr.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.current_stage)}`}>
                          {getStatusLabel(pr.current_stage)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(pr.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(pr)}
                            className="text-[#7C1D2E] hover:text-[#5A1420] transition-colors p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(pr.pr_no)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          DETAIL MODAL – Stage Timeline
          ============================================================ */}
      {showDetailModal && selectedPR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  PR Details: <span className="text-[#7C1D2E]">{selectedPR.pr_no}</span>
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedPR.department} • ₱{selectedPR.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {STAGES.findIndex(s => s.key === selectedPR.current_stage) + 1} / {STAGES.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#7C1D2E] h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${((STAGES.findIndex(s => s.key === selectedPR.current_stage) + 1) / STAGES.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Stage Timeline */}
            <div className="space-y-0">
              {STAGES.map((stage, index) => {
                const stageStatus = getStageStatus(stage.key, selectedPR);
                const historyEntry = stageHistory.find(h => h.stage_key === stage.key);
                const isCompleted = stageStatus === "completed";
                const isCurrent = stageStatus === "current";
                const isPending = stageStatus === "pending";
                const isLast = index === STAGES.length - 1;
                const nextStage = getNextPendingStage(selectedPR);

                return (
                  <div key={stage.key} className="relative">
                    {!isLast && (
                      <div
                        className={`absolute left-5 top-10 w-0.5 h-12 ${
                          isCompleted ? "bg-emerald-500" : "bg-gray-200"
                        }`}
                      />
                    )}

                    <div className="flex items-start gap-4 py-2">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          isCompleted
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                            ? "bg-[#D4A843] text-white ring-4 ring-[#D4A843]/30"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : isCurrent ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p
                              className={`font-medium ${
                                isCompleted
                                  ? "text-gray-700"
                                  : isCurrent
                                  ? "text-[#5A1420] font-bold"
                                  : "text-gray-400"
                              }`}
                            >
                              {stage.label}
                            </p>
                            {historyEntry && (
                              <p className="text-xs text-gray-400">
                                {new Date(historyEntry.completed_at).toLocaleString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {historyEntry.remarks && (
                                  <span className="block text-gray-500 text-xs mt-0.5 italic">
                                    Note: {historyEntry.remarks}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* ✅ FIX: Only show "Complete Stage" if there is a NEXT stage */}
                          {isCurrent && !isTerminal(selectedPR) && nextStage && (
                            <button
                              onClick={() => handleOpenStageModal(nextStage.key)}
                              className="px-4 py-1.5 bg-[#D4A843] hover:bg-[#C49A3A] text-white text-xs font-semibold rounded-lg transition shadow-sm flex items-center gap-1"
                            >
                              <ArrowRight className="h-3 w-3" />
                              Complete Stage
                            </button>
                          )}

                          {isCompleted && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}

                          {isPending && !isCurrent && (
                            <span className="text-xs text-gray-400">Pending</span>
                          )}

                          {isTerminal(selectedPR) && (
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {selectedPR.current_stage === "completed" ? "✅ Done" : "❌ Cancelled"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          COMPLETE STAGE MODAL – with Remarks
          ============================================================ */}
      {showStageModal && stageToComplete && selectedPR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#D4A843]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-[#D4A843]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Complete Stage</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedPR.pr_no} • {getStatusLabel(stageToComplete)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  PR Number
                </label>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  {selectedPR.pr_no}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Stage
                </label>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  {getStatusLabel(stageToComplete)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Notes / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={stageRemarks}
                  onChange={(e) => setStageRemarks(e.target.value)}
                  placeholder="Enter any notes or comments for this stage completion..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4A843] focus:border-transparent outline-none transition-all bg-white min-h-[100px] resize-y"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Please provide a brief remark for tracking purposes.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowStageModal(false);
                  setStageToComplete(null);
                  setStageRemarks("");
                }}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteStage}
                disabled={updatingStatus || !stageRemarks.trim()}
                className="px-5 py-2 bg-[#D4A843] hover:bg-[#C49A3A] text-white rounded-lg transition shadow-sm flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Complete Stage
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete PR?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{showDeleteConfirm}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePR(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}