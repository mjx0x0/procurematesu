"use client";

import { useEffect, useState } from "react";
import { useRouter }from "next/navigation";
import Link from "next/link";
import { Chatbot } from "@/components/chatbot/Chatbot";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { FileText, LogOut, User, PlusCircle, Eye, Clock, CheckCircle, Loader2, Bot, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PurchaseRequest { pr_no: string; purpose: string; total: number; current_stage: string; created_at: string; department: string; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth/login"); return; }
        setUser(user);

        const { data: userData } = await supabase.from("users").select("id, role").eq("id", user.id).single();
        let userRole = "end_user";
        if (userData) userRole = userData.role;
        else {
          await supabase.from("users").insert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email, role: "end_user", is_active: true });
        }
        setIsAdmin(userRole === "admin");

        let query = supabase.from("purchase_requests").select("*").order("created_at", { ascending: false });
        if (userRole !== "admin") query = query.eq("user_id", user.id);
        const { data: prsData } = await query;
        if (prsData) {
          const prList = prsData as PurchaseRequest[];
          setPrs(prList);
          setStats({
            total: prList.length,
            pending: prList.filter((p) => !["completed", "cancelled", "rejected"].includes(p.current_stage)).length,
            completed: prList.filter((p) => p.current_stage === "completed").length,
          });
        }
      } catch (err) { console.error("Error loading data:", err); }
      finally { setLoading(false); }
    };
    loadData();
  }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const getStatusColor = (status: string) => {
    if (status === "completed") return "bg-green-100 text-green-600";
    if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-600";
    const index = PROCUREMENT_STAGES.findIndex((stage) => stage.key === status);
    if (index < 5) return "bg-yellow-100 text-yellow-700";
    if (index < 10) return "bg-orange-100 text-orange-700";
    if (index < 14) return "bg-cyan-100 text-cyan-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const getStatusLabel = (status: string) => {
    if (status === "completed") return "Completed";
    if (status === "rejected") return "Rejected";
    if (status === "cancelled") return "Cancelled";
    return PROCUREMENT_STAGE_LABELS[status] || status;
  };

  const getStageNumber = (status: string) => PROCUREMENT_STAGES.find((stage) => stage.key === status)?.number;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><Loader2 className="h-12 w-12 animate-spin text-[#7A1315]" /></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="bg-white border-b border-red-950/10 px-4 py-3 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#7A1315] p-2 rounded-xl text-amber-300 border border-amber-400/30 shadow-xs"><FileText className="h-5 w-5" /></div>
            <div className="flex items-center gap-1.5"><span className="font-bold text-xl text-[#4D0C0D]">Procuremate<span className="text-[#B88E13]">SU</span></span><span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-50 text-[#7A1315] border border-red-200">MSU-GenSan</span></div>
            {isAdmin && <span className="text-xs bg-red-100 text-[#7A1315] font-semibold px-2 py-0.5 rounded-full border border-red-200">Admin</span>}
          </div>
          <div className="flex items-center gap-4"><span className="text-sm text-gray-600 hidden sm:inline"><User className="h-4 w-4 inline mr-1 text-[#7A1315]" />{user?.email}</span><button onClick={handleLogout} className="text-gray-500 hover:text-[#7A1315] hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Sign Out"><LogOut className="h-5 w-5" /></button></div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div><h1 className="text-3xl font-extrabold text-[#4D0C0D] tracking-tight">Welcome, {user?.user_metadata?.full_name || "MSU-GenSan Requisitioner"}!</h1><p className="text-gray-600 mt-1">Manage, draft, and track your purchase requests through the PMO procurement process</p></div>
          <div className="flex flex-wrap gap-3">
            {isAdmin && <Link href="/admin" className="bg-stone-800 hover:bg-stone-900 text-white px-5 py-2.5 rounded-xl font-medium shadow-xs transition-all flex items-center gap-2 whitespace-nowrap"><Shield className="h-4 w-4 text-amber-300" />Admin Panel</Link>}
            <Link href="/dashboard/chatbot" className="bg-white hover:bg-red-50 text-[#7A1315] border border-red-200/80 px-5 py-2.5 rounded-xl font-semibold shadow-2xs transition-all flex items-center gap-2 whitespace-nowrap"><Bot className="h-4 w-4 text-[#B88E13]" />AI Assistant</Link>
            <Link href="/dashboard/new-pr" className="bg-gradient-to-r from-[#7A1315] to-[#91191C] hover:from-[#630E10] hover:to-[#7A1315] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2 whitespace-nowrap border border-amber-400/30"><PlusCircle className="h-4 w-4 text-amber-300" />New Purchase Request</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-xs border border-stone-200/70"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-[#4D0C0D]">{stats.total}</div><div className="text-sm text-gray-600">Total Requisitions</div></div><div className="p-3 bg-red-50 rounded-xl text-[#7A1315]"><FileText className="h-6 w-6" /></div></div></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div><div className="text-sm text-gray-600">In Progress</div></div><div className="p-3 bg-yellow-50 rounded-lg"><Clock className="h-6 w-6 text-yellow-600" /></div></div></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div><div className="text-2xl font-bold text-green-600">{stats.completed}</div><div className="text-sm text-gray-600">Completed</div></div><div className="p-3 bg-green-50 rounded-lg"><CheckCircle className="h-6 w-6 text-green-600" /></div></div></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center"><div><h2 className="text-lg font-semibold text-gray-900">Your Purchase Requests</h2><p className="text-xs text-gray-500 mt-1">Status follows the official 20-step PMO procurement process.</p></div><span className="text-sm text-gray-500">{prs.length} total</span></div>
          {prs.length === 0 ? <div className="p-12 text-center"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Requests Yet</h3><p className="text-gray-600 mb-4">Create your first purchase request to get started.</p><Link href="/dashboard/new-pr" className="inline-block bg-[#7A1315] hover:bg-[#4D0C0D] text-white font-semibold px-6 py-2.5 rounded-xl shadow-xs transition-colors border border-amber-400/30 text-sm">Create Your First PR</Link></div> : <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PR Number</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{prs.map((pr) => <tr key={pr.pr_no} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4 text-sm font-medium text-gray-900">{pr.pr_no}</td><td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{pr.purpose}</td><td className="px-6 py-4 text-sm text-gray-900">₱{pr.total?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.current_stage)}`}>{getStageNumber(pr.current_stage) ? `Step ${getStageNumber(pr.current_stage)}: ` : ""}{getStatusLabel(pr.current_stage)}</span></td><td className="px-6 py-4 text-sm text-gray-500">{new Date(pr.created_at).toLocaleDateString()}</td><td className="px-6 py-4 text-right"><Link href={`/dashboard/pr/${pr.pr_no}`} className="text-[#7A1315] hover:text-[#4D0C0D] font-semibold transition-colors inline-flex items-center gap-1"><Eye className="h-4 w-4" />View</Link></td></tr>)}</tbody></table></div>}
        </div>
      </div>
      <Chatbot />
    </div>
  );
}
