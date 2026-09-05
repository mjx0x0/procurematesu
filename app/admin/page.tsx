"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  FileText,
  LogOut,
  User,
  Users,
  FileCheck,
  Clock,
  Loader2,
  PlusCircle,
  Eye,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  CheckCircle2,
  Check,
  XCircle,
  AlertCircle,
  Edit,
  Edit3,
  Trash2,
  RefreshCw,
  X,
  MessageSquare,
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
  remarks?: string;
}

interface ProcurementStageDef {
  key: string;
  name: string;
}

const PROCUREMENT_STAGES: ProcurementStageDef[] = [
  { key: "pr_submission", name: "PR Submission" },
  { key: "budget_clearance", name: "Budget Clearance" },
  { key: "chancellor_approval", name: "Chancellor Approval" },
  { key: "rfq_generation", name: "RFQ Generation" },
  { key: "abstract_of_quotations", name: "Abstract of Quotations" },
  { key: "bac_endorsement", name: "BAC Endorsement" },
  { key: "po_issued", name: "PO Issuance & Award" },
  { key: "delivery_inspection", name: "Delivery & Inspection" },
  { key: "completed", name: "Completed & Disbursed" },
];

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

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
  const [completedStages, setCompletedStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  // Complete Stage modal state (matches user reference Picture 2)
  const [showCompleteStageModal, setShowCompleteStageModal] = useState(false);
  const [stageToComplete, setStageToComplete] = useState<ProcurementStageDef | null>(null);
  const [assigneeName, setAssigneeName] = useState("");
  const [stageNotes, setStageNotes] = useState("");
  const [savingStage, setSavingStage] = useState(false);

  // Edit Remarks modal state
  const [showEditRemarksModal, setShowEditRemarksModal] = useState(false);
  const [stageToEditRemarks, setStageToEditRemarks] = useState<any | null>(null);
  const [editAssigneeName, setEditAssigneeName] = useState("");
  const [editRemarksText, setEditRemarksText] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);

  // General PR Remarks state
  const [prRemarks, setPrRemarks] = useState("");
  const [remarksSavedFeedback, setRemarksSavedFeedback] = useState(false);

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
      // Get all PRs
      const { data: prsData, error: prsError } = await supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (prsError) throw prsError;

      setPrs(prsData || []);
      setFilteredPrs(prsData || []);

      // Calculate stats
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

  // Apply filters
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

  const handleStatusUpdate = async (prNo: string, newStatus: string) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);

    try {
      // Update PR status
      const { error } = await supabase
        .from("purchase_requests")
        .update({ 
          current_stage: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("pr_no", prNo);

      if (error) throw error;

      // Add to stage history
      await supabase
        .from("pr_stages_completed")
        .insert({
          pr_no: prNo,
          stage_name: getStatusLabel(newStatus),
          stage_key: newStatus,
          completed_at: new Date().toISOString(),
        });

      await loadData();
      setSelectedPR(null);
      setShowDetailModal(false);
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatStageDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const loadPRStages = async (prNo: string) => {
    setLoadingStages(true);
    try {
      const { data, error } = await supabase
        .from("pr_stages_completed")
        .select("*")
        .eq("pr_no", prNo)
        .order("completed_at", { ascending: true });

      if (!error && data) {
        setCompletedStages(data);
      } else {
        setCompletedStages([]);
      }
    } catch (err) {
      console.warn("Error loading PR stages:", err);
      setCompletedStages([]);
    } finally {
      setLoadingStages(false);
    }
  };

  const handleOpenPRDetail = async (pr: PR) => {
    setSelectedPR(pr);
    setPrRemarks(pr.remarks || "");
    setRemarksSavedFeedback(false);
    setShowDetailModal(true);
    await loadPRStages(pr.pr_no);
  };

  const handleOpenCompleteStage = (stage: ProcurementStageDef) => {
    setStageToComplete(stage);
    const defaultAssignee =
      user?.user_metadata?.full_name ||
      (user?.email ? user.email.split("@")[0].replace(/[._-]/g, " ").toUpperCase() : "Procurement Officer");
    setAssigneeName(defaultAssignee);
    setStageNotes("");
    setShowCompleteStageModal(true);
  };

  const handleCompleteStageSubmit = async () => {
    if (!selectedPR || !stageToComplete) return;
    setSavingStage(true);

    try {
      const nowIso = new Date().toISOString();
      const finalNotes = stageNotes.trim() || `Completed stage: ${stageToComplete.name}`;
      const finalAssignee = assigneeName.trim() || "Procurement Staff";

      // 1. Record stage in pr_stages_completed
      const { error: stageError } = await supabase
        .from("pr_stages_completed")
        .insert({
          pr_no: selectedPR.pr_no,
          stage_key: stageToComplete.key,
          stage_name: stageToComplete.name,
          assigned_to: finalAssignee,
          notes: finalNotes,
          status: "completed",
          completed_at: nowIso,
        });

      if (stageError) throw stageError;

      // 2. Update purchase_requests current_stage & remarks
      const updatedRemarks = stageNotes.trim() ? stageNotes.trim() : (selectedPR.remarks || "");
      await supabase
        .from("purchase_requests")
        .update({
          current_stage: stageToComplete.key,
          remarks: updatedRemarks,
          updated_at: nowIso,
        })
        .eq("pr_no", selectedPR.pr_no);

      // 3. Update local states
      setSelectedPR((prev) =>
        prev
          ? {
              ...prev,
              current_stage: stageToComplete.key,
              remarks: updatedRemarks,
            }
          : null
      );
      if (updatedRemarks) {
        setPrRemarks(updatedRemarks);
      }

      await loadPRStages(selectedPR.pr_no);
      await loadData();
      setShowCompleteStageModal(false);
    } catch (err) {
      console.error("Complete stage error:", err);
      alert("Failed to complete stage. Please try again.");
    } finally {
      setSavingStage(false);
    }
  };

  const handleOpenEditRemarks = (stage: ProcurementStageDef, completedRecord?: any) => {
    setStageToEditRemarks({
      ...stage,
      recordId: completedRecord?.id,
    });
    setEditAssigneeName(completedRecord?.assigned_to || "");
    setEditRemarksText(completedRecord?.notes || "");
    setShowEditRemarksModal(true);
  };

  const handleSaveStageRemarks = async () => {
    if (!selectedPR || !stageToEditRemarks) return;
    setSavingRemarks(true);

    try {
      const nowIso = new Date().toISOString();
      if (stageToEditRemarks.recordId) {
        await supabase
          .from("pr_stages_completed")
          .update({
            notes: editRemarksText.trim(),
            assigned_to: editAssigneeName.trim(),
            updated_at: nowIso,
          })
          .eq("id", stageToEditRemarks.recordId);
      } else {
        await supabase
          .from("pr_stages_completed")
          .insert({
            pr_no: selectedPR.pr_no,
            stage_key: stageToEditRemarks.key,
            stage_name: stageToEditRemarks.name,
            assigned_to: editAssigneeName.trim() || "Procurement Staff",
            notes: editRemarksText.trim(),
            status: "pending",
            completed_at: nowIso,
          });
      }

      if (editRemarksText.trim()) {
        await supabase
          .from("purchase_requests")
          .update({
            remarks: editRemarksText.trim(),
            updated_at: nowIso,
          })
          .eq("pr_no", selectedPR.pr_no);

        setPrRemarks(editRemarksText.trim());
        setSelectedPR((prev) => (prev ? { ...prev, remarks: editRemarksText.trim() } : null));
      }

      await loadPRStages(selectedPR.pr_no);
      await loadData();
      setShowEditRemarksModal(false);
    } catch (err) {
      console.error("Save stage remarks error:", err);
      alert("Failed to save remarks. Please try again.");
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleSavePRRemarks = async () => {
    if (!selectedPR) return;
    setSavingRemarks(true);

    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          remarks: prRemarks.trim(),
          updated_at: nowIso,
        })
        .eq("pr_no", selectedPR.pr_no);

      if (error) throw error;

      setSelectedPR((prev) => (prev ? { ...prev, remarks: prRemarks.trim() } : null));
      setRemarksSavedFeedback(true);
      setTimeout(() => setRemarksSavedFeedback(false), 3000);
      await loadData();
    } catch (err) {
      console.error("Save PR remarks error:", err);
      alert("Failed to save remarks.");
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleDeletePR = async (prNo: string) => {
    if (!confirm(`Are you sure you want to delete PR ${prNo}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete items first (if any)
      await supabase.from("pr_items").delete().eq("pr_no", prNo);

      // Delete PR
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#7A1315] mx-auto" />
          <p className="mt-4 text-stone-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#7A1315] p-2 rounded-xl text-amber-300 border border-amber-400/30 shadow-xs">
              <FileText className="h-5 w-5 text-amber-200" />
            </div>
            <span className="font-bold text-xl text-[#4D0C0D]">
              Procuremate<span className="text-[#B88E13]">SU</span>
            </span>
            <span className="text-xs bg-red-100 text-[#7A1315] font-bold px-2.5 py-0.5 rounded-full border border-red-200">
              Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-600 hidden sm:inline font-medium">
              <User className="h-3.5 w-3.5 inline mr-1 text-[#7A1315]" />
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
            <h1 className="text-3xl font-extrabold text-[#4D0C0D]">Admin Dashboard</h1>
            <p className="text-stone-600 mt-1">MSU-GenSan Purchase Requests &amp; Modality Oversight</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-50 transition-colors flex items-center gap-2 border border-stone-300 text-sm font-medium shadow-2xs"
          >
            <RefreshCw className="h-4 w-4 text-[#7A1315]" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-200/90">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-[#7A1315]">{stats.total}</div>
                <div className="text-xs font-semibold text-stone-600">Total PRs</div>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <FileCheck className="h-5 w-5 text-[#7A1315]" />
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
          <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-200/90 text-center col-span-2 sm:col-span-3 lg:col-span-5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2.5 bg-red-50 text-[#7A1315] rounded-xl">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#4D0C0D]">Monitor Chatbot Inquiries</h3>
                <p className="text-xs text-stone-600">Review faculty &amp; staff inquiries to AI Procurement Assistant regarding procurement rules &amp; PR tracking.</p>
              </div>
            </div>
            <Link
              href="/admin/inquiries"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#7A1315] to-[#8B1518] hover:from-[#630E10] hover:to-[#7A1315] text-white rounded-xl text-xs font-semibold transition-all shadow-2xs border border-amber-400/30"
            >
              <span>View Inquiries</span>
              <span>&rarr;</span>
            </Link>
          </div>
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
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none transition-all bg-white"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="for_approval">For Approval</option>
                  <option value="budget_office">Budget Office</option>
                  <option value="chancellor_approval">Chancellor Approval</option>
                  <option value="procurement_processing">Processing</option>
                  <option value="canvassing">Canvassing</option>
                  <option value="bidding">Bidding</option>
                  <option value="for_award">For Award</option>
                  <option value="po_issued">PO Issued</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none transition-all bg-white"
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
              <FileText className="h-5 w-5 text-[#7A1315]" />
              <h2 className="text-base font-bold text-[#4D0C0D]">Purchase Requests</h2>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPrs.map((pr) => (
                    <tr key={pr.pr_no} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <button
                          onClick={() => handleOpenPRDetail(pr)}
                          className="hover:text-[#7A1315] hover:underline font-bold text-left"
                        >
                          {pr.pr_no}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{pr.purpose}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{pr.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        ₱{pr.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.current_stage)}`}>
                          {getStatusLabel(pr.current_stage)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-600 max-w-[160px] truncate" title={pr.remarks || ""}>
                        {pr.remarks ? (
                          <span className="font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            {pr.remarks}
                          </span>
                        ) : (
                          <span className="text-stone-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(pr.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenPRDetail(pr)}
                            className="text-[#7A1315] hover:text-[#4D0C0D] transition-colors p-1"
                            title="View and Update PR Details"
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

      {/* PR Details Modal - Flow and format matching user's reference image */}
      {showDetailModal && selectedPR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 animate-fade-in-up border border-stone-200 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3.5 border-b border-stone-200">
              <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                PR Details: {selectedPR.pr_no}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-3.5 bg-stone-50/80 rounded-lg border border-stone-200/80 my-4 text-xs">
              <div>
                <span className="text-stone-500 block">Department</span>
                <span className="font-semibold text-stone-800">{selectedPR.department}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Requested By</span>
                <span className="font-semibold text-stone-800">{selectedPR.printed_name || "N/A"}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Total Amount</span>
                <span className="font-bold text-[#7A1315]">
                  ₱{selectedPR.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Date Filed</span>
                <span className="font-semibold text-stone-800">
                  {new Date(selectedPR.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-4 pt-1 border-t border-stone-200/60">
                <span className="text-stone-500">Purpose: </span>
                <span className="font-medium text-stone-800">{selectedPR.purpose}</span>
              </div>
            </div>

            {/* Procurement Stages Section */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-bold text-stone-900">Procurement Stages</h4>
                {loadingStages && (
                  <span className="text-xs text-stone-400 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7A1315]" />
                    Updating stages...
                  </span>
                )}
              </div>

              {/* Stages List */}
              <div className="divide-y divide-stone-100 border-t border-b border-stone-100">
                {PROCUREMENT_STAGES.map((stage) => {
                  const completedRecord = completedStages.find(
                    (s) =>
                      s.stage_key === stage.key ||
                      s.stage_name?.toLowerCase() === stage.name.toLowerCase()
                  );
                  const isCompleted = Boolean(completedRecord);

                  return (
                    <div key={stage.key} className="py-3.5 flex items-center justify-between gap-3">
                      {/* Left: Icon & Title & Subtitle */}
                      <div className="flex items-start gap-3 min-w-0">
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-stone-300 flex items-center justify-center shrink-0 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="font-bold text-sm text-stone-900 leading-snug">
                            {stage.name}
                          </p>

                          {isCompleted ? (
                            <div className="space-y-0.5 mt-0.5">
                              {completedRecord?.notes && (
                                <p className="text-xs text-stone-600 break-words">
                                  {completedRecord.notes}
                                </p>
                              )}
                              {completedRecord?.assigned_to && (
                                <p className="text-[11px] text-stone-500">
                                  Assigned to: <span className="font-medium text-stone-700">{completedRecord.assigned_to}</span>
                                </p>
                              )}
                              <p className="text-xs font-medium text-emerald-600">
                                Completed: {formatStageDate(completedRecord.completed_at)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-stone-400 mt-0.5">Pending</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Badges and Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E8E7FA] text-[#554DB8]">
                              Completed
                            </span>
                            <button
                              onClick={() => handleOpenEditRemarks(stage, completedRecord)}
                              className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-1.5 rounded-md transition-colors text-xs flex items-center gap-1 font-medium"
                              title="Edit remarks for this stage"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Remarks</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#E8F1FD] text-[#1967D2]">
                              Pending
                            </span>
                            <button
                              onClick={() => handleOpenCompleteStage(stage)}
                              className="bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Remarks Feature Section */}
              <div className="mt-5 pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#7A1315]" />
                    General Remarks / Administrative Notes
                  </label>
                  {remarksSavedFeedback && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fade-in">
                      <Check className="w-3.5 h-3.5" /> Remarks Saved
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prRemarks}
                    onChange={(e) => setPrRemarks(e.target.value)}
                    placeholder="Enter PR remarks, notes, or follow-up details..."
                    className="flex-1 text-xs border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={handleSavePRRemarks}
                    disabled={savingRemarks}
                    className="px-4 py-2 bg-[#7A1315] hover:bg-[#630E10] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    {savingRemarks ? "Saving..." : "Save Remarks"}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer - Close Button (matches Picture 1) */}
            <div className="pt-5 mt-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-[#4E565F] hover:bg-[#3D434B] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Stage Modal - Exactly matches user reference Picture 2 */}
      {showCompleteStageModal && selectedPR && stageToComplete && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up border border-stone-200">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-stone-900">Complete Stage</h3>
              <button
                onClick={() => setShowCompleteStageModal(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  PR Number
                </label>
                <input
                  type="text"
                  value={selectedPR.pr_no}
                  disabled
                  className="w-full bg-stone-100 border border-stone-200 text-stone-600 text-sm rounded-lg p-2.5 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Stage
                </label>
                <input
                  type="text"
                  value={stageToComplete.name}
                  disabled
                  className="w-full bg-stone-100 border border-stone-200 text-stone-600 text-sm rounded-lg p-2.5 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Enter assignee name"
                  className="w-full border border-stone-300 text-stone-900 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder="Enter any notes or comments"
                  rows={3}
                  className="w-full border border-stone-300 text-stone-900 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end items-center gap-2.5 mt-6">
              <button
                onClick={() => setShowCompleteStageModal(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteStageSubmit}
                disabled={savingStage}
                className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-lg text-sm font-semibold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {savingStage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Complete Stage"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Remarks Modal - For managing stage-level notes */}
      {showEditRemarksModal && stageToEditRemarks && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 animate-fade-in-up border border-stone-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-stone-900">
                Update Remarks: {stageToEditRemarks.name}
              </h3>
              <button
                onClick={() => setShowEditRemarksModal(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={editAssigneeName}
                  onChange={(e) => setEditAssigneeName(e.target.value)}
                  placeholder="Enter assignee name"
                  className="w-full border border-stone-300 text-stone-900 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  value={editRemarksText}
                  onChange={(e) => setEditRemarksText(e.target.value)}
                  rows={3}
                  placeholder="Enter remarks or comments for this stage"
                  className="w-full border border-stone-300 text-stone-900 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowEditRemarksModal(false)}
                className="px-3.5 py-1.5 border border-stone-300 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStageRemarks}
                disabled={savingRemarks}
                className="px-4 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {savingRemarks ? "Saving..." : "Save Remarks"}
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