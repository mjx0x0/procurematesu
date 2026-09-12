"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Chatbot } from "@/components/chatbot/Chatbot";
import {
  PROCUREMENT_STAGES,
  PROCUREMENT_STAGE_LABELS,
} from "@/lib/procurement-process";
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

const quickActions = [
  {
    href: "/dashboard/new-pr",
    label: "Create Purchase Request",
    description:
      "Start a new procurement request and submit the required details.",
    icon: PlusCircle,
    tone: "gold",
  },
  {
    href: "/dashboard/transparency",
    label: "Transparency Board",
    description:
      "Browse public procurement information and institutional records.",
    icon: BarChart3,
    tone: "light",
  },
  {
    href: "/dashboard/chatbot",
    label: "Ask Gab AI",
    description:
      "Get guidance on RA 12009, PR preparation, SVP, and procurement stages.",
    icon: Bot,
    tone: "light",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/auth/login");
          return;
        }

        setUser(authUser);

        const { data: userData } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", authUser.id)
          .single();

        let userRole = "end_user";

        if (userData) {
          userRole = userData.role;
        } else {
          await supabase.from("users").insert({
            id: authUser.id,
            email: authUser.email,
            full_name:
              authUser.user_metadata?.full_name || authUser.email || "User",
            role: "end_user",
            is_active: true,
          });
        }

        setIsAdmin(userRole === "admin");

        let query = supabase
          .from("purchase_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (userRole !== "admin") {
          query = query.eq("user_id", authUser.id);
        }

        const { data: prsData } = await query;

        if (prsData) {
          const prList = prsData as PurchaseRequest[];
          setPrs(prList);
          setStats({
            total: prList.length,
            pending: prList.filter(
              (pr) => !TERMINAL_STAGES.includes(pr.current_stage),
            ).length,
            completed: prList.filter(
              (pr) => pr.current_stage === "completed",
            ).length,
          });
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    if (status === "completed") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (["rejected", "cancelled"].includes(status)) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    const index = PROCUREMENT_STAGES.findIndex(
      (stage) => stage.key === status,
    );

    if (index < 5) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    if (index < 10) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }

    if (index < 14) {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }

    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const getStatusLabel = (status: string) => {
    if (status === "completed") return "Completed";
    if (status === "rejected") return "Rejected";
    if (status === "cancelled") return "Cancelled";
    return PROCUREMENT_STAGE_LABELS[status] || status;
  };

  const getStageNumber = (status: string) =>
    PROCUREMENT_STAGES.find((stage) => stage.key === status)?.number;

  const recent = prs.slice(0, 4);
  const displayName = user?.user_metadata?.full_name || "Requisitioner";
  const initials = displayName.slice(0, 2).toUpperCase();
  const activeRequest = prs.find(
    (pr) => !TERMINAL_STAGES.includes(pr.current_stage),
  );

  if (loading) {
    return (
      <div className="app-theme flex min-h-screen items-center justify-center bg-[#F7F5F2]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#7A1315]" />
          <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-stone-400">
            Preparing your workspace
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-theme min-h-screen bg-[#F7F5F2] text-[#302725]">
      <header className="sticky top-0 z-40 border-b border-[#7A1315]/10 bg-[#FCFBF9]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1220px] items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-8">
          <Link
            href="/dashboard"
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1315] to-[#4D0C0D] shadow-[0_7px_20px_rgba(77,12,13,.16)]">
              <FileText className="h-4 w-4 text-[#F0C83F]" />
            </div>
            <div className="min-w-0 leading-none">
              <div className="truncate text-[11px] font-extrabold tracking-[-.015em] text-[#4D0C0D] sm:text-[12px]">
                MSU GenSan Procurement Management System
              </div>
              <div className="mt-1 text-[7px] font-bold uppercase tracking-[.18em] text-[#B88E13]">
                End User Workspace
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard/notifications"
              className="relative rounded-xl p-2 text-stone-500 transition hover:bg-[#FFF7E4] hover:text-[#7A1315]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
            </Link>

            <div className="hidden h-7 w-px bg-stone-200 sm:block" />

            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-[#FFF6D9] text-[9px] font-black text-[#6B4F05]">
                {initials}
              </div>
              <div className="max-w-[150px] leading-tight">
                <p className="truncate text-[9px] font-bold text-stone-800">
                  {displayName}
                </p>
                <p className="truncate text-[8px] text-stone-400">
                  {user?.email}
                </p>
              </div>
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                className="hidden items-center gap-1.5 rounded-xl border border-[#D4AF37]/45 bg-[#FFFDF6] px-3 py-2 text-[9px] font-bold text-[#7A1315] transition hover:-translate-y-0.5 hover:shadow-sm sm:flex"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#B88E13]" />
                Admin
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="rounded-xl p-2 text-stone-400 transition hover:bg-red-50 hover:text-[#7A1315]"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1220px] px-4 py-5 sm:px-7 sm:py-8 lg:px-8">
        <section className="relative overflow-hidden rounded-[24px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#5A080A] via-[#760D10] to-[#4A0507] px-5 py-7 shadow-[0_24px_60px_rgba(77,12,13,.14)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-[#F0C83F]/10 blur-3xl" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C83F]/35 bg-[#F0C83F]/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.16em] text-[#F5D766]">
                <Sparkles className="h-3 w-3" />
                Institutional Procurement
              </span>
              <h1 className="mt-4 max-w-[760px] text-[30px] font-semibold leading-[1.02] tracking-[-.035em] text-white sm:text-[40px]">
                Good day, {displayName}.
              </h1>
              <p className="mt-3 max-w-[670px] text-[11px] leading-5 text-white/70 sm:text-[12px]">
                Manage your purchase requests, follow their progress through the university procurement workflow, and access procurement guidance from one refined workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 lg:pb-1">
              <Link
                href="/dashboard/new-pr"
                className="inline-flex items-center gap-2 rounded-xl border border-[#F0C83F]/50 bg-gradient-to-r from-[#F0C83F] to-[#D4A82C] px-4 py-3 text-[10px] font-extrabold text-[#4D0C0D] shadow-[0_10px_25px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,.2)]"
              >
                <PlusCircle className="h-4 w-4" />
                Create Purchase Request
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [stats.total, "Total Requests", "All submitted PRs", FileText, "bg-[#FFF2F2] text-[#7A1315]"],
            [stats.pending, "In Progress", "Awaiting next stage", Clock, "bg-[#FFF8E5] text-[#9A7205]"],
            [stats.completed, "Completed", "Successfully delivered", CheckCircle, "bg-[#ECFFF5] text-[#087449]"],
          ].map(([number, title, subtitle, Icon, tone]: any) => (
            <div
              key={title}
              className="group rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(45,35,30,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(45,35,30,.07)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-stone-400">
                    {title}
                  </p>
                  <p className="mt-1 text-[25px] font-black tracking-[-.03em] text-[#4D0C0D]">
                    {number}
                  </p>
                  <p className="mt-0.5 text-[9px] text-stone-500">
                    {subtitle}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          {quickActions.map(({ href, label, description, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
                tone === "gold"
                  ? "border-[#D4AF37]/35 bg-gradient-to-br from-[#FFFDF5] to-[#FFF7DD] shadow-[0_12px_30px_rgba(184,142,19,.08)]"
                  : "border-stone-200/80 bg-white shadow-[0_10px_28px_rgba(45,35,30,.045)]"
              }`}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#D4AF37]/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />
              <div className="relative flex items-start justify-between gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    tone === "gold"
                      ? "bg-[#7A1315] text-[#F0C83F]"
                      : "bg-[#FFF6E4] text-[#9A7205]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#7A1315]" />
              </div>
              <h2 className="relative mt-4 text-[12px] font-extrabold text-[#4D0C0D]">
                {label}
              </h2>
              <p className="relative mt-1.5 text-[9px] leading-5 text-stone-500">
                {description}
              </p>
            </Link>
          ))}
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_330px]">
          <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_12px_34px_rgba(45,35,30,.05)]">
            <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[13px] font-extrabold text-[#4D0C0D]">
                  Recent Purchase Requests
                </h2>
                <p className="mt-0.5 text-[9px] text-stone-500">
                  Your latest activity in the 20-stage procurement workflow.
                </p>
              </div>
              <Link
                href="/dashboard/transparency"
                className="inline-flex items-center gap-1 text-[9px] font-bold text-[#7A1315]"
              >
                View records <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="p-10 text-center">
                <ClipboardList className="mx-auto h-9 w-9 text-stone-300" />
                <h3 className="mt-3 text-[12px] font-bold text-stone-800">
                  No purchase requests yet
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-stone-500">
                  Create your first request to begin tracking it through the university procurement process.
                </p>
                <Link
                  href="/dashboard/new-pr"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7A1315] px-4 py-2.5 text-[9px] font-bold text-white shadow-sm transition hover:bg-[#5E0C0E]"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Create your first PR
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {recent.map((pr) => (
                  <Link
                    key={pr.pr_no}
                    href={`/dashboard/pr/${pr.pr_no}`}
                    className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[#FFFBF7]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E8] text-[#7A1315]">
                      <FileText className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold text-[#7A1315]">
                          {pr.pr_no}
                        </span>
                        <span className="text-[8px] text-stone-400">
                          {new Date(pr.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] font-semibold text-stone-700">
                        {pr.purpose || "Official procurement request"}
                      </p>
                      <p className="mt-0.5 truncate text-[8px] text-stone-400">
                        {pr.department || "University Office"}
                      </p>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="text-[10px] font-extrabold text-stone-800">
                        ₱
                        {Number(pr.total || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[8px] font-bold ${getStatusColor(
                          pr.current_stage,
                        )}`}
                      >
                        {getStageNumber(pr.current_stage)
                          ? `Step ${getStageNumber(pr.current_stage)} · `
                          : ""}
                        {getStatusLabel(pr.current_stage)}
                      </span>
                    </div>

                    <Eye className="h-4 w-4 shrink-0 text-stone-300 transition group-hover:text-[#7A1315]" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#5D090B] to-[#7A1315] p-5 text-white shadow-[0_16px_38px_rgba(77,12,13,.10)]">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#F0C83F]/10 blur-2xl" />
              <div className="relative flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F0C83F]/30 bg-[#F0C83F]/10 text-[#F0C83F]">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F0D56A]">
                    Procurement Advisor
                  </p>
                  <h3 className="mt-0.5 text-[13px] font-extrabold">
                    Gab AI
                  </h3>
                </div>
              </div>
              <p className="relative mt-3 text-[9px] leading-5 text-white/70">
                Need help with RA 12009, PR preparation, procurement stages, or SVP? Gab can guide you through the process.
              </p>
              <Link
                href="/dashboard/chatbot"
                className="relative mt-4 flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2.5 text-[9px] font-bold text-[#F5D766] transition hover:bg-white/[0.12]"
              >
                Ask Gab <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </section>

            <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(45,35,30,.045)]">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-[#B88E13]" />
                <h3 className="text-[12px] font-extrabold text-[#4D0C0D]">
                  Workspace at a glance
                </h3>
              </div>

              {activeRequest ? (
                <div className="mt-4 rounded-xl border border-[#E9D9AE] bg-[#FFFDF6] p-3">
                  <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#A07A13]">
                    Active request
                  </p>
                  <p className="mt-1 text-[10px] font-extrabold text-[#7A1315]">
                    {activeRequest.pr_no}
                  </p>
                  <p className="mt-1 truncate text-[9px] text-stone-500">
                    {getStatusLabel(activeRequest.current_stage)}
                  </p>
                  <Link
                    href={`/dashboard/pr/${activeRequest.pr_no}`}
                    className="mt-2 inline-flex items-center gap-1 text-[8px] font-bold text-[#7A1315]"
                  >
                    Continue tracking <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-[9px] leading-5 text-stone-500">
                  You have no active procurement requests. Start a new request whenever you are ready.
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/transparency"
                  className="rounded-xl border border-stone-200 px-3 py-2.5 text-[8px] font-bold text-stone-600 transition hover:border-[#D4AF37]/50 hover:text-[#7A1315]"
                >
                  Transparency
                </Link>
                <Link
                  href="/dashboard/chatbot"
                  className="rounded-xl border border-stone-200 px-3 py-2.5 text-[8px] font-bold text-stone-600 transition hover:border-[#D4AF37]/50 hover:text-[#7A1315]"
                >
                  Ask Gab AI
                </Link>
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-stone-200/80 py-5 text-center sm:flex-row sm:text-left">
          <p className="text-[8px] text-stone-400">
            MSU GenSan Procurement Management System · Institutional access
          </p>
          <div className="flex items-center gap-3 text-[8px] text-stone-400">
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3 w-3" />
              {user?.email}
            </span>
            <span className="h-3 w-px bg-stone-200" />
            <span>RA 12009 Compliant</span>
          </div>
        </footer>
      </main>

      <Chatbot />
    </div>
  );
}
