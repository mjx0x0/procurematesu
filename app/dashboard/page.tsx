"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, BarChart3, Bot, CheckCircle, ChevronDown, ClipboardList, Clock, Eye, FileText, LayoutDashboard, Loader2, LogOut, PlusCircle, ShieldCheck, Sparkles } from "lucide-react";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        if (role === "admin") {
          router.replace("/admin");
          return;
        }
        setIsAdmin(false);
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

  const displayName = user?.user_metadata?.full_name || "Requisitioner";
  const initials = displayName.slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="app-theme flex min-h-[100svh] items-center justify-center bg-[#F7F5F2] px-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#7B0046]" />
          <span className="text-center text-[9px] font-semibold uppercase tracking-[.16em] text-stone-400">Preparing your workspace</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-theme min-h-[100svh] overflow-x-hidden bg-[#F7F5F2] text-[#302725] dashboard-page">
      <header className="sticky top-0 z-40 border-b border-[#7B0046]/10 bg-[#FCFBF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[60px] max-w-[1220px] items-center justify-between gap-3 px-4 py-2.5 sm:min-h-[68px] sm:px-7 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <MsuLogo size={36} className="shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="max-w-[210px] truncate text-xs sm:text-sm font-extrabold tracking-tight text-[#4D002C] sm:max-w-none">MSU GenSan Procurement Management</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#F5AB26]">End User Workspace</div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationPopover />
            <div className="hidden h-7 w-px bg-stone-200 sm:block" />
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-stone-200/80 bg-white px-2.5 py-1.5 transition hover:border-[#F5AB26]/60 hover:bg-[#FFFDF7] focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20 cursor-pointer"
                aria-expanded={userMenuOpen}
                aria-label="User account menu"
              >
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border border-[#F5AB26]/45 bg-[#FFF6D9] text-[9px] sm:text-[10px] font-black text-[#6B4F05]">
                  {initials}
                </div>
                <div className="hidden max-w-[150px] text-left leading-tight sm:block">
                  <p className="truncate text-[10px] font-bold text-stone-800">{displayName}</p>
                  <p className="truncate text-[8px] text-stone-400">{user?.email}</p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${userMenuOpen ? "rotate-180 text-[#7B0046]" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(45,25,20,0.12)]">
                  <div className="border-b border-stone-100 px-3 py-2.5">
                    <p className="truncate text-xs font-bold text-stone-900">{displayName}</p>
                    <p className="truncate text-[10px] text-stone-500">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-800 border border-amber-200/60">
                        {isAdmin ? "Administrator" : "Requisitioner"}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-[#7B0046] transition"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#F5AB26]" />
                      <span>Admin Portal</span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1220px] px-3.5 py-4 sm:px-7 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-[24px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#4A002A] via-[#6B003E] to-[#3D0024] p-8 sm:p-12 md:p-14 shadow-[0_18px_45px_rgba(77,0,44,.12)]">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          <div className="relative">
            <div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-white">Good day, {displayName}.</h1>
              <p className="mt-2.5 max-w-[850px] text-xs sm:text-sm leading-relaxed text-white/80">Manage your purchase requests, follow their progress through the university procurement workflow, and access procurement guidance from one refined workspace.</p>
            </div>
          </div>
        </section>

        <section className="mt-5 sm:mt-6" aria-label="Main Feature Shortcuts">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* 1. Create Purchase Request */}
            <Link
              href="/dashboard/new-pr"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[160px] sm:min-h-[170px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#4D002C] transition-colors">
                  Create PR
                </h2>
                <p className="text-xs sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Draft and submit a new request with automated compliance checking
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#7B0046]">
                <span>Action</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>

            {/* 2. View Purchase Requests */}
            <Link
              href="/dashboard/purchase-requests"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[160px] sm:min-h-[170px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#4D002C] transition-colors">
                  Purchase Requests
                </h2>
                <p className="text-xs sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Monitor approval stages, view full records, and print official PR documents
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-600 group-hover:text-[#7B0046]">
                <span>{prs.length} {prs.length === 1 ? "Record" : "Records"}</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>

            {/* 3. Gab AI Chatbot */}
            <Link
              href="/dashboard/chatbot"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[160px] sm:min-h-[170px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#4D002C] transition-colors">
                  AI Chatbot
                </h2>
                <p className="text-xs sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Get instant guidance on RA 12009, PR preparation, and procurement steps
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-600 group-hover:text-[#7B0046]">
                <span>Gab AI</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>

            {/* 4. Transparency Board */}
            <Link
              href="/dashboard/transparency"
              className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(45,35,30,0.03)] hover:shadow-[0_14px_34px_rgba(77,0,44,0.08)] hover:border-[#7B0046]/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer min-h-[160px] sm:min-h-[170px]"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#4D002C] transition-colors">
                  Transparency Board
                </h2>
                <p className="text-xs sm:text-[13px] text-stone-500 font-normal leading-relaxed">
                  Access official university bidding notices, published awards, and contracts
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-600 group-hover:text-[#7B0046]">
                <span>Browse</span>
                <ArrowRight className="h-4 w-4 transition-transform shrink-0" />
              </div>
            </Link>
          </div>
        </section>

        {/* 3 Procurement Overviews (Compact & Subtle) */}



        <footer className="mt-auto py-8 text-center text-xs text-stone-500">
          © {new Date().getFullYear()} Mindanao State University - General Santos · Procurement Management System
        </footer>
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
