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
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  RefreshCw,
  X,
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
      const total = prsData?.length || 0;
      const pending = prsData?.filter(p => p.current_stage === "draft" || p.current_stage === "pending").length || 0;
      const in_progress = prsData?.filter(p => 
        p.current_stage !== "draft" && 
        p.current_stage !== "pending" && 
        p.current_stage !== "completed" && 
        p.current_stage !== "cancelled"
      ).length || 0;
      const completed = prsData?.filter(p => p.current_stage === "completed").length || 0;
      const cancelled = prsData?.filter(p => p.current_stage === "cancelled").length || 0;

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">ProcuremateSU</span>
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              <User className="h-4 w-4 inline mr-1" />
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600 transition-colors"
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage all purchase requests</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/70 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-white transition-colors flex items-center gap-2 border border-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.in_progress}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                <div className="text-sm text-gray-600">Cancelled</div>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by PR number, purpose, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/70"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/70"
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
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/70"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* PR Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Purchase Requests</h2>
              <span className="text-sm text-gray-500">({filteredPrs.length})</span>
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
                            onClick={() => {
                              setSelectedPR(pr);
                              setShowDetailModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
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

      {/* Detail Modal */}
      {showDetailModal && selectedPR && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedPR.pr_no} – Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">PR Number</p>
                  <p className="font-medium">{selectedPR.pr_no}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date(selectedPR.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{selectedPR.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Requested By</p>
                  <p className="font-medium">{selectedPR.printed_name || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Purpose</p>
                  <p className="font-medium">{selectedPR.purpose}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold text-blue-600">
                    ₱{selectedPR.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPR.current_stage)}`}>
                    {getStatusLabel(selectedPR.current_stage)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {["pending", "for_approval", "budget_office", "chancellor_approval", "procurement_processing", "canvassing", "bidding", "for_award", "po_issued", "completed", "cancelled"].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(selectedPR.pr_no, status)}
                      disabled={updatingStatus || selectedPR.current_stage === status}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedPR.current_stage === status
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
                {updatingStatus && (
                  <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating status...
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
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