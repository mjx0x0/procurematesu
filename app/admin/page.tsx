"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  FileText, LogOut, User, Users, FileCheck, Clock, Loader2,
  Plus, Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

interface PR {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  created_at: string;
  department: string;
  user_id: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
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
    };
    checkAdmin();
  }, [router]);

  const loadData = async () => {
    try {
      // Get all PRs
      const { data: prsData } = await supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (prsData) {
        setPrs(prsData);
        const total = prsData.length;
        const pending = prsData.filter(p =>
          p.current_stage !== "completed" && p.current_stage !== "cancelled"
        ).length;
        const completed = prsData.filter(p => p.current_stage === "completed").length;
        setStats({ total, pending, completed });
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDelete = async () => {
    if (!selectedPR) return;
    setDeleting(true);
    try {
      // Delete PR items first (due to foreign key)
      await supabase
        .from("pr_items")
        .delete()
        .eq("pr_no", selectedPR);

      // Delete PR
      await supabase
        .from("purchase_requests")
        .delete()
        .eq("pr_no", selectedPR);

      // Also delete any related stages
      await supabase
        .from("pr_stages_completed")
        .delete()
        .eq("pr_no", selectedPR);

      setShowDeleteModal(false);
      setSelectedPR(null);
      await loadData();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
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
      cancelled: "bg-red-100 text-red-600"
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
      cancelled: "Cancelled"
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">ProcuremateSU</span>
            <span className="hidden sm:inline text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Admin</span>
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex gap-3">
            <Link
              href="/admin/inquiries"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Inquiries
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total PRs</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* PR Management Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Requests Management</h2>
            <span className="text-sm text-gray-500">{prs.length} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PR No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No purchase requests found.
                    </td>
                  </tr>
                ) : (
                  prs.map((pr) => (
                    <tr key={pr.pr_no} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {pr.pr_no}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {pr.purpose}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {pr.department}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₱{pr.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.current_stage)}`}>
                          {getStatusLabel(pr.current_stage)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/pr/${pr.pr_no}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedPR(pr.pr_no);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete PR <strong>{selectedPR}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPR(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}