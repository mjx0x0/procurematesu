"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chatbot } from "@/components/chatbot/Chatbot";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { FileText, LogOut, User, PlusCircle, Eye, Clock, CheckCircle, Loader2, Bot, ShieldCheck, LayoutDashboard, ClipboardList, BarChart3, Bell, ArrowUpRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PurchaseRequest { pr_no: string; purpose: string; total: number; current_stage: string; created_at: string; department: string; }

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/new-pr", label: "Create Purchase Request", icon: PlusCircle },
  { href: "/dashboard/transparency", label: "Transparency Board", icon: BarChart3 },
  { href: "/dashboard/chatbot", label: "Ask Gab AI", icon: Bot },
];

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
    if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "rejected" || status === "cancelled") return "bg-red-50 text-red-700 border-red-200";
    const index = PROCUREMENT_STAGES.findIndex((stage) => stage.key === status);
    if (index < 5) return "bg-amber-50 text-amber-700 border-amber-200";
    if (index < 10) return "bg-orange-50 text-orange-700 border-orange-200";
    if (index < 14) return "bg-sky-50 text-sky-700 border-sky-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const getStatusLabel = (status: string) => {
    if (status === "completed") return "Completed";
    if (status === "rejected") return "Rejected";
    if (status === "cancelled") return "Cancelled";
    return PROCUREMENT_STAGE_LABELS[status] || status;
  };

  const getStageNumber = (status: string) => PROCUREMENT_STAGES.find((stage) => stage.key === status)?.number;
  const recent = prs.slice(0, 4);

  if (loading) return <div className="app-theme min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#7A1315]" /></div>;

  return (
    <div className="app-theme flex min-h-screen">
      <aside className="portal-sidebar hidden lg:flex lg:w-[236px] lg:flex-col lg:shrink-0">
        <div className="flex h-full flex-col">
          <div className="px-5 py-5 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-[#D4AF37]/35"><FileText className="h-5 w-5 text-[#F0C83F]" /></div>
              <div className="min-w-0"><div className="text-[12px] font-bold text-white">MSU GenSan</div><div className="text-[9px] font-semibold uppercase tracking-[.11em] text-[#F0C83F]">Procurement System</div></div>
            </Link>
          </div>
          <div className="px-4 pt-6"><p className="px-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/40">Portal Menu</p><nav className="mt-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`portal-nav-item ${href === "/dashboard" ? "is-active" : ""}`}><Icon className="h-4 w-4" /><span>{label}</span>{label === "Ask Gab AI" && <span className="ml-auto rounded bg-[#F0C83F] px-1.5 py-0.5 text-[7px] font-black text-[#4D0C0D]">AI</span>}</Link>)}
          </nav></div>
          <div className="mt-auto p-4">
            {isAdmin && <Link href="/admin" className="mb-3 flex items-center gap-2 rounded-xl border border-[#D4AF37]/25 bg-white/5 px-3 py-2.5 text-[10px] font-bold text-white/80 hover:bg-white/10"><ShieldCheck className="h-4 w-4 text-[#F0C83F]" /> Admin Workspace</Link>}
            <div className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0C83F] text-[10px] font-black text-[#5A090B]">{(user?.user_metadata?.full_name || user?.email || "U").slice(0,2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-[10px] font-bold text-white">{user?.user_metadata?.full_name || "University User"}</p><p className="truncate text-[8px] text-white/45">{user?.email}</p></div></div></div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="portal-topbar sticky top-0 z-40">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-7">
            <div className="lg:hidden flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A1315] text-[#F0C83F]"><FileText className="h-4 w-4" /></div><span className="text-[11px] font-bold text-[#4D0C0D]">MSU GenSan Procurement System</span></div>
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-semibold text-stone-500"><span className="text-[#7A1315]">MSU GenSan Procurement System</span><span>/</span><span>End User Workspace</span></div>
            <div className="ml-auto flex items-center gap-2.5"><Link href="/dashboard/notifications" className="relative rounded-lg p-2 text-stone-500 hover:bg-red-50 hover:text-[#7A1315]"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D4AF37]" /></Link><button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-semibold text-stone-500 hover:bg-red-50 hover:text-[#7A1315]"><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span></button></div>
          </div>
        </header>

        <main className="mx-auto max-w-[1180px] px-4 py-5 sm:px-7 sm:py-7">
          <section className="portal-hero relative overflow-hidden rounded-2xl p-5 sm:p-7">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><span className="portal-kicker"><Sparkles className="h-3 w-3" /> MSU GenSan Procurement</span><h1 className="mt-3 text-white">Good day, {user?.user_metadata?.full_name || "Requisitioner"}.</h1><p className="mt-1.5 max-w-[620px] text-[11px] leading-5 text-white/60">Prepare purchase requests, monitor procurement progress, and access institutional procurement guidance from one workspace.</p></div>
              <Link href="/dashboard/new-pr" className="ui-button ui-button-gold shrink-0"><PlusCircle className="h-4 w-4" /> Create Purchase Request</Link>
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[[stats.total, "Total Requests", "All submitted PRs", FileText, "text-[#7A1315]", "bg-red-50"], [stats.pending, "In Progress", "Awaiting next stage", Clock, "text-amber-700", "bg-amber-50"], [stats.completed, "Completed", "Successfully delivered", CheckCircle, "text-emerald-700", "bg-emerald-50"]].map(([n, title, sub, Icon, color, bg]: any) => <div key={title} className="portal-stat"><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-400">{title}</p><div className={`mt-1 text-2xl font-black ${color}`}>{n}</div><p className="mt-0.5 text-[9px] text-stone-500">{sub}</p></div><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} ${color}`}><Icon className="h-4 w-4" /></div></div>)}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_310px]">
            <section className="portal-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><div><h2 className="text-[#4D0C0D]">Recent Purchase Requests</h2><p className="text-[9px] text-stone-500">Your latest activity in the 20-stage procurement workflow</p></div><Link href="#requests" className="text-[9px] font-bold text-[#7A1315] hover:text-[#4D0C0D]">View all <ArrowUpRight className="inline h-3 w-3" /></Link></div>
              {recent.length === 0 ? <div className="p-10 text-center"><ClipboardList className="mx-auto h-9 w-9 text-stone-300" /><h3 className="mt-3 text-stone-800">No purchase requests yet</h3><p className="mx-auto mt-1 max-w-sm text-[10px] text-stone-500">Create your first request to begin tracking it through the university procurement process.</p><Link href="/dashboard/new-pr" className="ui-button ui-button-primary mt-4">Create your first PR</Link></div> : <div className="divide-y divide-stone-100">{recent.map((pr) => <Link key={pr.pr_no} href={`/dashboard/pr/${pr.pr_no}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-[#FFF9F5]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E8] text-[#7A1315]"><FileText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-extrabold text-[#7A1315]">{pr.pr_no}</span><span className="text-[9px] text-stone-400">{new Date(pr.created_at).toLocaleDateString()}</span></div><p className="mt-0.5 truncate text-[10px] font-semibold text-stone-700">{pr.purpose || "Official procurement request"}</p><p className="mt-0.5 text-[9px] text-stone-400">{pr.department || "University Office"}</p></div><div className="hidden text-right sm:block"><p className="text-[11px] font-extrabold text-stone-800">₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[8px] font-bold ${getStatusColor(pr.current_stage)}`}>{getStageNumber(pr.current_stage) ? `Step ${getStageNumber(pr.current_stage)} · ` : ""}{getStatusLabel(pr.current_stage)}</span></div><Eye className="h-4 w-4 text-stone-300 transition-colors group-hover:text-[#7A1315]" /></Link>)}</div>}
            </section>

            <div className="space-y-5">
              <section className="portal-card p-5"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF8E4] text-[#9A7205]"><Bot className="h-4 w-4" /></div><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#B88E13]">Procurement Advisor</p><h3 className="mt-0.5 text-[#4D0C0D]">Ask Gab AI</h3></div></div><p className="mt-3 text-[10px] leading-5 text-stone-500">Get guidance on RA 12009, PR preparation, procurement stages, SVP, and related questions.</p><Link href="/dashboard/chatbot" className="mt-4 flex items-center justify-between rounded-xl border border-[#E7CF78]/70 bg-[#FFFDF5] px-3 py-2.5 text-[9px] font-bold text-[#7A1315] hover:bg-[#FFF8E4]">Chat with Gab <ArrowUpRight className="h-3.5 w-3.5" /></Link></section>
              <section className="portal-card p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#B88E13]" /><h3 className="text-[#4D0C0D]">Transparency & Records</h3></div><p className="mt-2 text-[10px] leading-5 text-stone-500">Review publicly available procurement information and keep your own requests organized.</p><Link href="/dashboard/transparency" className="mt-3 inline-flex items-center gap-1 text-[9px] font-bold text-[#7A1315]">Open Transparency Board <ArrowUpRight className="h-3 w-3" /></Link></section>
            </div>
          </div>

          <section id="requests" className="portal-card mt-5 overflow-hidden"><div className="border-b border-stone-100 px-5 py-4"><h2 className="text-[#4D0C0D]">All Purchase Requests</h2><p className="text-[9px] text-stone-500">Official 20-stage PMO procurement workflow</p></div>{prs.length === 0 ? <div className="p-8 text-center text-[10px] text-stone-500">No purchase requests found.</div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="px-5 py-3 text-left">PR Number</th><th className="px-5 py-3 text-left">Purpose</th><th className="px-5 py-3 text-left">Amount</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{prs.map((pr) => <tr key={pr.pr_no} className="hover:bg-[#FFF9F5]"><td className="px-5 py-3.5 text-[10px] font-extrabold text-[#7A1315]">{pr.pr_no}</td><td className="max-w-xs truncate px-5 py-3.5 text-[10px] text-stone-700">{pr.purpose}</td><td className="px-5 py-3.5 text-[10px] font-bold text-stone-800">₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-5 py-3.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-bold ${getStatusColor(pr.current_stage)}`}>{getStageNumber(pr.current_stage) ? `Step ${getStageNumber(pr.current_stage)} · ` : ""}{getStatusLabel(pr.current_stage)}</span></td><td className="px-5 py-3.5 text-[9px] text-stone-500">{new Date(pr.created_at).toLocaleDateString()}</td><td className="px-5 py-3.5 text-right"><Link href={`/dashboard/pr/${pr.pr_no}`} className="inline-flex items-center gap-1 text-[9px] font-bold text-[#7A1315]"><Eye className="h-3.5 w-3.5" /> View</Link></td></tr>)}</tbody></table></div>}</section>
        </main>
      </div>
      <Chatbot />
    </div>
  );
}
