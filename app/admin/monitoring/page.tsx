"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PROCUREMENT_STAGES } from "@/lib/procurement-process";
import { AlertTriangle, ArrowLeft, BarChart3, CheckCircle, Clock, Eye, Filter, Loader2, Search, ShieldAlert, SlidersHorizontal } from "lucide-react";

interface PR { pr_no: string; purpose: string; total: number; current_stage: string; created_at: string; pr_date: string; department: string; section?: string | null; printed_name: string; user_id: string; }
interface Stage { pr_no: string; stage_key: string; stage_name: string; completed_at: string; status?: string | null; remarks?: string | null; notes?: string | null; }

type Risk = "on-track" | "approaching" | "delayed";

// Monitoring heuristic only. These are not official MSU service-level commitments.
const ATTENTION_DAYS = 3;
const DELAY_DAYS = 5;

const stageLabel = (key: string) => PROCUREMENT_STAGES.find(s => s.key === key)?.label || key.replace(/_/g, " ");
const stageNumber = (key: string) => PROCUREMENT_STAGES.find(s => s.key === key)?.number || 0;
const daysSince = (iso: string) => Math.max(0, (Date.now() - new Date(iso).getTime()) / 86400000);
const riskFor = (pr: PR, stage?: Stage): Risk => {
  if (pr.current_stage === "completed" || pr.current_stage === "rejected" || pr.current_stage === "cancelled") return "on-track";
  const age = stage ? daysSince(stage.completed_at) : daysSince(pr.created_at);
  return age >= DELAY_DAYS ? "delayed" : age >= ATTENTION_DAYS ? "approaching" : "on-track";
};

export default function AdminMonitoringPage() {
  const router = useRouter();
  const [prs, setPrs] = useState<PR[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  useEffect(() => {
    (async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }
      if (!user) { router.replace("/auth/login"); return; }
      const { data: profile } = await supabase.from("users").select("role,is_active").eq("id", user.id).maybeSingle();
      if (!profile || profile.role !== "admin" || profile.is_active === false) { router.replace("/dashboard"); return; }
      const [{ data: prData }, { data: stageData }] = await Promise.all([
        supabase.from("purchase_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("pr_stages_completed").select("pr_no,stage_key,stage_name,completed_at,status,remarks,notes").order("completed_at", { ascending: true }),
      ]);
      setPrs((prData || []) as PR[]);
      setStages((stageData || []) as Stage[]);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [router]);

  const latestStage = useMemo(() => {
    const map = new Map<string, Stage>();
    for (const s of stages) map.set(s.pr_no, s);
    return map;
  }, [stages]);

  const departments = useMemo(() => [...new Set(prs.map(p => p.department).filter(Boolean))].sort(), [prs]);
  const stageOptions = useMemo(() => PROCUREMENT_STAGES.map(s => ({ key: s.key, label: s.label })), []);

  const filtered = useMemo(() => prs.filter(pr => {
    const latest = latestStage.get(pr.pr_no);
    const risk = riskFor(pr, latest);
    const q = query.trim().toLowerCase();
    const amount = Number(pr.total || 0);
    const date = pr.pr_date || pr.created_at.slice(0, 10);
    return (!q || [pr.pr_no, pr.purpose, pr.department, pr.section || "", pr.printed_name].some(v => v.toLowerCase().includes(q)))
      && (stageFilter === "all" || pr.current_stage === stageFilter)
      && (departmentFilter === "all" || pr.department === departmentFilter)
      && (riskFilter === "all" || risk === riskFilter)
      && (!dateFrom || date >= dateFrom)
      && (!dateTo || date <= dateTo)
      && (!minAmount || amount >= Number(minAmount))
      && (!maxAmount || amount <= Number(maxAmount));
  }), [prs, latestStage, query, stageFilter, departmentFilter, riskFilter, dateFrom, dateTo, minAmount, maxAmount]);

  const metrics = useMemo(() => {
    const risks = prs.map(p => riskFor(p, latestStage.get(p.pr_no)));
    return { total: prs.length, delayed: risks.filter(r => r === "delayed").length, approaching: risks.filter(r => r === "approaching").length, active: prs.filter(p => !["completed", "rejected", "cancelled"].includes(p.current_stage)).length };
  }, [prs, latestStage]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]"><Loader2 className="h-9 w-9 animate-spin text-[#7C1D2E]" /></div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl text-stone-500 hover:text-[#7A1315] hover:bg-stone-100 transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-[#4D0C0D] p-2 rounded-xl text-amber-300 shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <b className="text-xl font-black text-[#4D0C0D]">
                  Procurement <span className="text-[#B88E13]">Monitoring</span>
                </b>
                <span className="text-[11px] bg-red-50 text-[#7A1315] border border-red-200/80 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Admin Tool
                </span>
              </div>
              <p className="text-[10px] text-stone-500">Live operational oversight & SLA bottleneck detection</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs font-bold text-stone-600 hover:text-[#7A1315] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-7">
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-[#4D0C0D]">Procurement Monitoring Dashboard</h1>
          <p className="text-sm text-stone-600 mt-1">
            Track stages, detect turnaround delays, and proactively clear procurement bottlenecks across university departments.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Metric label="Total PRs" value={metrics.total} icon={<BarChart3 className="h-4 w-4" />} />
          <Metric label="Active in Workflow" value={metrics.active} icon={<Clock className="h-4 w-4" />} />
          <Metric label="Approaching Threshold" value={metrics.approaching} icon={<ShieldAlert className="h-4 w-4" />} warning />
          <Metric label="Potential Delays" value={metrics.delayed} icon={<AlertTriangle className="h-4 w-4" />} danger />
        </div>

        <section className="ui-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4 font-bold text-[#4D0C0D]">
            <SlidersHorizontal className="h-4 w-4 text-[#B88E13]" />
            <span>Advanced Filters & Query</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="lg:col-span-2 relative block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search PR no., requester, department, purpose..."
                className="ui-input w-full pl-10 pr-3 py-2 text-sm"
              />
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="ui-select w-full px-3 py-2 text-sm"
            >
              <option value="all">All Stages (1-20)</option>
              {stageOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  Step {stageNumber(s.key)} — {s.label}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="ui-select w-full px-3 py-2 text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="ui-select w-full px-3 py-2 text-sm"
            >
              <option value="all">All Health Conditions</option>
              <option value="on-track">On Track</option>
              <option value="approaching">Approaching Attention Threshold</option>
              <option value="delayed">Potentially Delayed</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-bold whitespace-nowrap">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ui-input w-full px-3 py-2 text-xs"
                title="From date"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-bold whitespace-nowrap">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ui-input w-full px-3 py-2 text-xs"
                title="To date"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Min ₱"
                className="ui-input w-full px-3 py-2 text-xs"
              />
              <span className="text-stone-300">-</span>
              <input
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Max ₱"
                className="ui-input w-full px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#B88E13]" />
              <span>Showing <b>{filtered.length}</b> of <b>{prs.length}</b> Purchase Requests.</span>
            </div>
            <span className="text-[11px] text-stone-400 italic">
              * Monitoring health thresholds are internal heuristics (&gt;{DELAY_DAYS} days delayed, &gt;{ATTENTION_DAYS} days caution).
            </span>
          </div>
        </section>

        <section className="ui-card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
            <h2 className="font-bold text-[#4D0C0D] text-base">Procurement Records</h2>
            <span className="text-xs text-stone-500 font-medium">Sorted by date updated</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-stone-500 font-bold">Purchase Request</th>
                  <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-stone-500 font-bold">Requester & Department</th>
                  <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-stone-500 font-bold">Current Stage</th>
                  <th className="text-right px-5 py-3.5 text-[11px] uppercase tracking-wider text-stone-500 font-bold">Total Budget</th>
                  <th className="text-left px-5 py-3.5 text-[11px] uppercase tracking-wider text-stone-500 font-bold">Health Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] uppercase tracking-wider text-stone-500 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((pr) => {
                  const latest = latestStage.get(pr.pr_no);
                  const risk = riskFor(pr, latest);
                  const age = latest ? daysSince(latest.completed_at) : daysSince(pr.created_at);
                  return (
                    <tr key={pr.pr_no} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#7A1315]">{pr.pr_no}</div>
                        <div className="text-xs text-stone-500 max-w-xs truncate mt-0.5">{pr.purpose}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-stone-900">{pr.printed_name}</div>
                        <div className="text-xs text-stone-500">{pr.department}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-[#4D0C0D]">
                          Step {stageNumber(pr.current_stage) || "—"}
                        </span>
                        <div className="text-xs text-stone-500 max-w-xs truncate">{stageLabel(pr.current_stage)}</div>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-stone-800">
                        ₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        <RiskBadge risk={risk} age={age} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/pr/${encodeURIComponent(pr.pr_no)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#7A1315] bg-red-50/60 hover:bg-red-50 border border-red-200 transition-colors shadow-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> View PR
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-14 text-center text-sm text-stone-500">
                <BarChart3 className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                <p className="font-semibold">No Purchase Requests match the selected filters.</p>
                <p className="text-xs text-stone-400 mt-1">Try clearing some filters or searching for another term.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  danger,
  warning,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`ui-card p-4 transition-all ${
        danger
          ? "border-red-200 bg-red-50/20"
          : warning
          ? "border-amber-200 bg-amber-50/20"
          : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-bold ${
          danger ? "text-red-700" : warning ? "text-amber-800" : "text-stone-500"
        }`}
      >
        <span
          className={`p-1.5 rounded-lg ${
            danger
              ? "bg-red-100 text-red-700"
              : warning
              ? "bg-amber-100 text-amber-800"
              : "bg-stone-100 text-stone-700"
          }`}
        >
          {icon}
        </span>
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-black ${
          danger ? "text-red-700" : warning ? "text-amber-900" : "text-[#4D0C0D]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function RiskBadge({ risk, age }: { risk: Risk; age: number }) {
  const config =
    risk === "delayed"
      ? { label: "Potentially Delayed", cls: "bg-red-50 text-red-700 border-red-200" }
      : risk === "approaching"
      ? { label: "Needs Attention", cls: "bg-amber-50 text-amber-800 border-amber-200" }
      : { label: "On Track", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };

  return (
    <div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.cls}`}
      >
        {risk === "delayed" ? (
          <AlertTriangle className="h-3 w-3 text-red-600" />
        ) : risk === "approaching" ? (
          <Clock className="h-3 w-3 text-amber-600" />
        ) : (
          <CheckCircle className="h-3 w-3 text-emerald-600" />
        )}
        {config.label}
      </span>
      <div className="text-[10px] text-stone-400 font-medium mt-1">
        {age.toFixed(1)} days at latest stage
      </div>
    </div>
  );
}
