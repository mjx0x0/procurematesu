"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, BarChart3, Bot, CheckCircle, ClipboardList, Clock, Eye, FileText, LayoutDashboard, Loader2, LogOut, PlusCircle, ShieldCheck, Sparkles } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";
import { Chatbot } from "@/components/chatbot/Chatbot";
import { NotificationPopover } from "@/components/NotificationPopover";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { supabase } from "@/lib/supabase/client";

interface PurchaseRequest {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  created_at: string;
  department: string;
}

const TERMINAL_STAGES = ["completed", "cancelled", "rejected"];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      try {
        let { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          const { data: { session } } = await supabase.auth.getSession();
          authUser = session?.user || null;
        }
        if (!authUser) {
          router.replace("/");
          return;
        }
        if (cancelled) return;
        setUser(authUser);

        const [{ data: profile }, { data: prData }] = await Promise.all([
          supabase.from("users").select("role").eq("id", authUser.id).maybeSingle(),
          supabase.from("purchase_requests").select("pr_no,purpose,total,current_stage,created_at,department").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(20),
        ]);

        if (cancelled) return;
        const role = profile?.role || "end_user";
        setIsAdmin(role === "admin");
        const list = (prData || []) as PurchaseRequest[];
        setPrs(list);
        setStats({
          total: list.length,
          pending: list.filter((pr) => !TERMINAL_STAGES.includes(pr.current_stage)).length,
          completed: list.filter((pr) => pr.current_stage === "completed").length,
        });
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const statusColor = (status: string) => {
    if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "rejected" || status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  const statusLabel = (status: string) => {
    if (status === "completed") return "Completed";
    if (status === "rejected") return "Rejected";
    if (status === "cancelled") return "Cancelled";
    return PROCUREMENT_STAGE_LABELS[status] || status.replace(/_/g, " ");
  };

  const stageNumber = (status: string) => PROCUREMENT_STAGES.find((stage) => stage.key === status)?.number;
  const displayName = user?.user_metadata?.full_name || "Requisitioner";
  const initials = displayName.slice(0, 2).toUpperCase();
  const recent = prs.slice(0, 5);
  const activeRequest = prs.find((pr) => !TERMINAL_STAGES.includes(pr.current_stage));

  if (loading) {
    return (
      <div className="app-theme flex min-h-[100svh] items-center justify-center bg-[#F7F5F2] px-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#7A1315]" />
          <span className="text-center text-[9px] font-semibold uppercase tracking-[.16em] text-stone-400">Preparing your workspace</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-theme min-h-[100svh] overflow-x-hidden bg-[#F7F5F2] text-[#302725] dashboard-page">
      <header className="sticky top-0 z-40 border-b border-[#7A1315]/10 bg-[#FCFBF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[60px] max-w-[1220px] items-center justify-between gap-3 px-4 py-2.5 sm:min-h-[68px] sm:px-7 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <MsuLogo size={36} className="shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="max-w-[210px] truncate text-xs sm:text-sm font-extrabold tracking-tight text-[#4D0C0D] sm:max-w-none">MSU GenSan Procurement Management</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#B88E13]">End User Workspace</div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationPopover />
            <div className="hidden h-7 w-px bg-stone-200 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-[#FFF6D9] text-[9px] font-black text-[#6B4F05]">{initials}</div>
              <div className="max-w-[150px] leading-tight"><p className="truncate text-[9px] font-bold text-stone-800">{displayName}</p><p className="truncate text-[8px] text-stone-400">{user?.email}</p></div>
            </div>
            {isAdmin && <Link href="/admin" className="hidden items-center gap-1.5 rounded-xl border border-[#D4AF37]/45 bg-[#FFFDF6] px-3 py-2 text-[9px] font-bold text-[#7A1315] sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-[#B88E13]" />Admin</Link>}
            <button onClick={handleLogout} className="dashboard-logout inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-red-50 hover:text-[#7A1315]" title="Logout"><LogOut className="h-4 w-4" /><span>Logout</span></button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1220px] px-3.5 py-4 sm:px-7 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-[20px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#5A080A] via-[#760D10] to-[#4A0507] p-5 sm:p-8 md:p-9 shadow-[0_18px_45px_rgba(77,12,13,.12)]">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C83F]/35 bg-[#F0C83F]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#F5D766]"><Sparkles className="h-3.5 w-3.5" />Institutional Procurement</span>
              <h1 className="mt-3 text-xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-white">Good day, {displayName}.</h1>
              <p className="mt-2.5 max-w-[670px] text-xs sm:text-sm leading-relaxed text-white/80">Manage your purchase requests, follow their progress through the university procurement workflow, and access procurement guidance from one refined workspace.</p>
            </div>
            <Link href="/dashboard/new-pr" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F0C83F]/50 bg-gradient-to-r from-[#F0C83F] to-[#D4A82C] px-5 py-3 text-xs sm:text-sm font-extrabold text-[#4D0C0D] shadow-[0_10px_25px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5 sm:w-auto"><PlusCircle className="h-4 w-4" />Create Purchase Request</Link>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-3">
          {[{n:stats.total,t:"Total Requests",s:"All submitted PRs",Icon:FileText,tone:"bg-[#FFF2F2] text-[#7A1315]"},{n:stats.pending,t:"In Progress",s:"Awaiting next stage",Icon:Clock,tone:"bg-[#FFF8E5] text-[#9A7205]"},{n:stats.completed,t:"Completed",s:"Successfully delivered",Icon:CheckCircle,tone:"bg-[#ECFFF5] text-[#087449]"}].map((item) => (
            <div key={item.t} className={`rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(45,35,30,.04)] ${item.t === "Completed" ? "col-span-2 sm:col-span-1" : ""}`}>
              <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-stone-500">{item.t}</p><p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#4D0C0D]">{item.n}</p><p className="mt-0.5 text-xs text-stone-500">{item.s}</p></div><div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><item.Icon className="h-5 w-5" /></div></div>
            </div>
          ))}
        </section>

        <div className="mt-4 grid gap-4 sm:mt-6 xl:grid-cols-[1fr_340px]">
          <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_12px_34px_rgba(45,35,30,.045)]">
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6 sm:py-4.5 bg-stone-50/50">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#4D0C0D]">Recent Purchase Requests</h2>
                <p className="mt-0.5 text-xs sm:text-sm text-stone-500">Select a request to view its procurement timeline and status.</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#F8F2E8] border border-[#E9D9AE] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#9A7205]">
                My requests ({recent.length})
              </span>
            </div>
            {recent.length === 0 ? (
              <div className="p-10 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-stone-300" />
                <h3 className="mt-3 text-sm font-bold text-stone-800">No purchase requests yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-500">Create your first request to begin tracking it through the university procurement process.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {recent.map((pr) => (
                  <Link
                    key={pr.pr_no}
                    href={`/dashboard/pr/${pr.pr_no}`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 transition hover:bg-[#FFFBF7]"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E8] text-[#7A1315] border border-[#F5D8C4] shadow-xs">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-[#7A1315]">{pr.pr_no}</span>
                          <span className="text-xs text-stone-400 font-medium">· {new Date(pr.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-stone-800">{pr.purpose || "Official procurement request"}</p>
                        <p className="mt-0.5 text-xs text-stone-500 font-medium">{pr.department || "University Office"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t border-stone-100 sm:border-0">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-extrabold text-stone-900">₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusColor(pr.current_stage)}`}>
                          {stageNumber(pr.current_stage) ? `Stage ${stageNumber(pr.current_stage)} · ` : ""}{statusLabel(pr.current_stage)}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-[#7A1315] shadow-xs group-hover:bg-[#7A1315] group-hover:text-white group-hover:border-[#7A1315] transition-all shrink-0">
                        <Eye className="h-4 w-4" />
                        <span>Track PR</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <section className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#5D090B] to-[#7A1315] p-5 text-white shadow-[0_16px_38px_rgba(77,12,13,.09)]">
              <div className="relative flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0C83F]/30 bg-[#F0C83F]/10 text-[#F0C83F]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#F0D56A]">Procurement Advisor</p>
                  <h3 className="mt-0.5 text-base font-extrabold">Gab AI</h3>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/80">Need help with RA 12009, PR preparation, procurement stages, or SVP? Gab can guide you through the process.</p>
              <Link href="/dashboard/chatbot" className="mt-4 flex items-center justify-between rounded-xl border border-white/20 bg-white/[0.1] px-4 py-2.5 text-xs font-bold text-[#F5D766] hover:bg-white/[0.16] transition-colors">
                <span>Open Gab AI</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(45,35,30,.04)]">
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4 text-[#B88E13]" />
                <h3 className="text-sm font-extrabold text-[#4D0C0D]">Current activity</h3>
              </div>
              {activeRequest ? (
                <div className="mt-3 rounded-xl border border-[#E9D9AE] bg-[#FFFDF6] p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#A07A13]">Active request</p>
                  <p className="mt-1 font-mono text-sm font-extrabold text-[#7A1315]">{activeRequest.pr_no}</p>
                  <p className="mt-1 truncate text-xs text-stone-600 font-medium">{statusLabel(activeRequest.current_stage)}</p>
                  <Link href={`/dashboard/pr/${activeRequest.pr_no}`} className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1315] hover:text-[#5A1420]">
                    <span>Continue tracking</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-stone-500">You have no active procurement requests. Start a new request whenever you are ready.</p>
              )}
            </section>

            <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(45,35,30,.04)]">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-[#B88E13]" />
                <h3 className="text-sm font-extrabold text-[#4D0C0D]">Transparency Board</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">Browse official MSU-GenSan public procurement postings and bidding records.</p>
              <Link href="/dashboard/transparency" className="mt-3.5 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-bold text-[#7A1315] hover:bg-[#7A1315] hover:text-white hover:border-[#7A1315] transition-all">
                <span>View Transparency Board</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </div>

        <footer className="mt-6 flex flex-col items-center justify-between gap-1.5 border-t border-stone-200/80 py-4 text-center sm:mt-8 sm:flex-row sm:text-left"><p className="text-xs text-stone-500">MSU GenSan Procurement Management System · Institutional access</p><p className="text-xs text-stone-500">RA 12009 Compliant</p></footer>
      </main>
      <Chatbot />
      <style jsx global>{`
        .dashboard-page .dashboard-logout::before,
        .dashboard-page .dashboard-logout::after,
        .dashboard-page button[title="Logout"]::before,
        .dashboard-page button[title="Logout"]::after,
        .dashboard-page button[aria-label="Logout"]::before,
        .dashboard-page button[aria-label="Logout"]::after {
          content: none !important;
          display: none !important;
        }
        .dashboard-page .dashboard-logout span { display: inline !important; }
      `}</style>
    </div>
  );
}
