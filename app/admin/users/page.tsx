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
        <Loader2 className="h-10 w-10 animate-spin text-[#7C1D2E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800">
      <nav className="bg-white/95 border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#7C1D2E] p-2 rounded-xl text-[#D4A843]"><Users className="h-5 w-5" /></div>
            <b className="text-xl text-[#5A1420]">Procuremate<span className="text-[#D4A843]">SU</span></b>
            <span className="text-xs bg-red-50 text-[#7C1D2E] border border-red-200 px-2 py-1 rounded-full font-semibold">User Management</span>
          </div>
          <Link href="/admin" className="flex items-center gap-1.5 text-sm font-semibold text-[#7C1D2E] hover:text-[#5A1420]"><ArrowLeft className="h-4 w-4" /> Admin Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#5A1420]">End-User Accounts</h1>
            <p className="text-stone-600 mt-1">Review and authorize institutional account registrations.</p>
          </div>
          <button onClick={loadUsers} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>

        {pendingCount > 0 && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span><b>{pendingCount}</b> registration{pendingCount === 1 ? "" : "s"} awaiting approval.</span>
          </div>
        )}

        {error && <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex gap-2 flex-wrap mb-5">
          {(["pending", "approved", "rejected", "all"] as const).map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${filter === value ? "bg-[#7C1D2E] text-white border-[#7C1D2E]" : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"}`}>
              {value[0].toUpperCase() + value.slice(1)} {value === "pending" && pendingCount > 0 ? `(${pendingCount})` : ""}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center text-stone-500">No {filter === "all" ? "user registrations" : filter + " accounts"} found.</div>
          ) : filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-[#5A1420]">{user.full_name}</h2>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${user.status === "approved" ? "bg-emerald-100 text-emerald-700" : user.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{user.status}</span>
                  </div>
                  <p className="text-sm text-stone-600 mt-1 break-all">{user.email}</p>
                  {(user.department || user.college) && <p className="text-xs text-stone-500 mt-1">{[user.department, user.college].filter(Boolean).join(" · ")}</p>}
                  <p className="text-[11px] text-stone-400 mt-1">Registered {new Date(user.created_at).toLocaleString()}</p>
                </div>

                {user.role !== "admin" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button disabled={busyId === user.id} onClick={() => updateStatus(user.id, "approved")} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C1D2E] text-white text-xs font-semibold hover:bg-[#5A1420] disabled:opacity-50">
                      {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Approve
                    </button>
                    <button disabled={busyId === user.id} onClick={() => updateStatus(user.id, "rejected")} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50">
                      {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />} Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-xs text-stone-500 flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> New registrations remain inactive until an administrator approves them.</div>
      </main>
    </div>
  );
}
