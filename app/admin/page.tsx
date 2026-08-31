"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  FileText, LogOut, User, Users, FileCheck, Clock, Loader2,
  AlertCircle, Building2, Activity, CheckCircle
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    departments: 0,
  });
  const [recentPRs, setRecentPRs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push("/auth/login");
          return;
        }

        // 2. Get user role via RPC (bypasses RLS)
        const { data: role, error: rpcError } = await supabase
          .rpc("get_user_role", { user_id: user.id });

        if (rpcError || role === null) {
          // User record missing – insert default
          const { error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email,
              role: "end_user",
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            setError("Failed to set up your account. Please contact the admin.");
            setLoading(false);
            return;
          }
          // After insert, redirect to dashboard (not admin)
          router.push("/dashboard");
          return;
        }

        if (role !== "admin") {
          router.push("/dashboard");
          return;
        }

        // Admin – load stats and data
        setUser(user);
        await loadStats();
        await loadRecentPRs();
      } catch (err) {
        console.error("Admin check error:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const loadStats = async () => {
      const { count: total, error: totalError } = await supabase
        .from("purchase_requests")
        .select("*", { count: "exact", head: true });

      const { count: pending, error: pendingError } = await supabase
        .from("purchase_requests")
        .select("*", { count: "exact", head: true })
        .not("current_stage", "eq", "completed")
        .not("current_stage", "eq", "cancelled");

      const { count: completed, error: completedError } = await supabase
        .from("purchase_requests")
        .select("*", { count: "exact", head: true })
        .eq("current_stage", "completed");

      if (!totalError) setStats((prev) => ({ ...prev, total: total || 0 }));
      if (!pendingError) setStats((prev) => ({ ...prev, pending: pending || 0 }));
      if (!completedError) setStats((prev) => ({ ...prev, completed: completed || 0 }));

      // Get unique departments count
      const { data: depts, error: deptError } = await supabase
        .from("purchase_requests")
        .select("department");
      if (!deptError && depts) {
        const uniqueDepts = new Set(depts.map((p) => p.department));
        setStats((prev) => ({ ...prev, departments: uniqueDepts.size }));
      }
    };

    const loadRecentPRs = async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("pr_no, purpose, total, current_stage, created_at, department")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error) setRecentPRs(data || []);
    };

    checkAdmin();
  }, [router]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Error</h2>
              <p className="text-gray-600 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of all procurement activities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Purchase Requests</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30">
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

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30">
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

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.departments}</div>
                <div className="text-sm text-gray-600">Departments Engaged</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent PRs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Purchase Requests</h2>
            <span className="text-sm text-gray-500">{recentPRs.length} latest</span>
          </div>

          {recentPRs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No purchase requests yet.</p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentPRs.map((pr) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">User Management</h3>
            <p className="text-sm text-gray-600 mt-1">Manage faculty and staff accounts.</p>
            <button className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
              Go to Users →
            </button>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30 text-center">
            <FileCheck className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">PR Logbook</h3>
            <p className="text-sm text-gray-600 mt-1">View and manage all purchase requests.</p>
            <button className="mt-4 text-green-600 hover:text-green-800 font-medium text-sm">
              View All PRs →
            </button>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30 text-center">
            <Activity className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">Monitor Inquiries</h3>
            <p className="text-sm text-gray-600 mt-1">See what users are asking the chatbot.</p>
            <button className="mt-4 text-purple-600 hover:text-purple-800 font-medium text-sm">
              View Inquiries →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}