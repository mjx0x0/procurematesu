"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, UserCheck, UserX, Users, RefreshCw, AlertCircle } from "lucide-react";

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  college: string | null;
  is_active: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load accounts.");
      setUsers(result.users || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateStatus = async (userId: string, status: "approved" | "rejected") => {
    if (busyId) return;
    setBusyId(userId);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update account.");
      setUsers((current) => current.map((user) => user.id === userId ? result.user : user));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to update account.");
    } finally {
      setBusyId(null);
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((user) => filter === "all" || user.status === filter),
    [users, filter]
  );

  const pendingCount = users.filter((user) => user.status === "pending").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
        <Loader2 className="h-10 w-10 animate-spin text-[#7B0046]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl text-stone-500 hover:text-[#7B0046] hover:bg-stone-100 transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-[#4D002C] p-2 rounded-xl text-amber-300 shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <b className="text-xl font-black text-[#4D002C]">
                  User <span className="text-[#F5AB26]">Management</span>
                </b>
                <span className="text-[11px] bg-red-50 text-[#7B0046] border border-red-200/80 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Admin Tool
                </span>
              </div>
              <p className="text-[10px] text-stone-500">Review, authorize, and verify university personnel registrations</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs font-bold text-stone-600 hover:text-[#7B0046] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#4D002C]">End-User Accounts</h1>
            <p className="text-sm text-stone-600 mt-1">Review and authorize institutional account registrations.</p>
          </div>
          <button
            onClick={loadUsers}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#F5AB26]" /> Refresh Accounts
          </button>
        </div>

        {pendingCount > 0 && (
          <div className="mb-5 bg-amber-50/80 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <AlertCircle className="h-4 w-4" />
            </div>
            <span>
              <b>{pendingCount}</b> registration{pendingCount === 1 ? "" : "s"} awaiting approval before access is granted.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 flex-wrap mb-5">
          {(["pending", "approved", "rejected", "all"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs ${
                filter === value
                  ? "bg-gradient-to-r from-[#7B0046] to-[#4D002C] text-white border-[#4D002C]"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {value[0].toUpperCase() + value.slice(1)}{" "}
              {value === "pending" && pendingCount > 0 ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-300 text-[#4D002C] font-extrabold text-[10px]">
                  {pendingCount}
                </span>
              ) : (
                ""
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="ui-card p-12 text-center text-stone-500">
              <Users className="h-10 w-10 mx-auto text-stone-300 mb-2" />
              <p className="font-semibold">No {filter === "all" ? "user registrations" : filter + " accounts"} found.</p>
              <p className="text-xs text-stone-400 mt-1">Select another filter tab or refresh the listing.</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="ui-card p-5 hover:border-amber-200 transition-all hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#7B0046]/10 to-[#F5AB26]/20 border border-[#7B0046]/20 flex items-center justify-center font-bold text-[#7B0046] text-base shrink-0">
                      {user.full_name?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-[#4D002C] text-base">{user.full_name}</h2>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            user.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : user.status === "rejected"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {user.status}
                        </span>
                        {user.role === "admin" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            Administrator
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 mt-1 break-all font-medium">{user.email}</p>
                      {(user.department || user.college) && (
                        <p className="text-xs text-stone-500 mt-1">
                          {[user.department, user.college].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="text-[11px] text-stone-400 mt-1">
                        Registered on {new Date(user.created_at).toLocaleString("en-PH")}
                      </p>
                    </div>
                  </div>

                  {user.role !== "admin" && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                      <button
                        disabled={busyId === user.id}
                        onClick={() => updateStatus(user.id, "approved")}
                        className="ui-button ui-button-primary text-xs py-2 px-3.5 disabled:opacity-50"
                      >
                        {busyId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-amber-300" />
                        )}
                        Approve Account
                      </button>
                      <button
                        disabled={busyId === user.id}
                        onClick={() => updateStatus(user.id, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50 shadow-xs"
                      >
                        {busyId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 text-xs text-stone-500 flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>New registrations remain inactive until an administrator approves them. Once approved, the user can immediately log in.</span>
        </div>
      </main>
    </div>
  );
}
