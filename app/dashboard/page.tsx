"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Chatbot } from "@/components/chatbot/Chatbot";
import { NotificationPopover } from "@/components/NotificationPopover";

import { supabase } from "@/lib/supabase/client";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";

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
      <SystemPageHeader
        titlePrimary="MSU GenSan Procurement Management"
        titleAccent="System"
        workspaceLabel="End User Workspace"
        brandLogo
        backHref={null}
        roleLabel={isAdmin ? "Administrator" : "Requisitioner"}
        showAdminPortal={isAdmin}
        containerClassName="max-w-[1220px] px-3.5 sm:px-7 lg:px-8"
      >
        <NotificationPopover />
        <div className="hidden h-7 w-px bg-stone-200 sm:block" />
      </SystemPageHeader>

      <main className="mx-auto w-full max-w-[1220px] px-3.5 py-4 sm:px-7 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-[24px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#4A002A] via-[#6B003E] to-[#3D0024] p-5 sm:p-12 md:p-14 shadow-[0_18px_45px_rgba(77,0,44,.12)]">
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

        <footer className="mt-12 py-8 text-center text-xs text-stone-500 border-t border-stone-200">
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
