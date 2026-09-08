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
      const { data: { user } } = await supabase.auth.getUser();
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
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800">
      <nav className="bg-white/95 border-b border-stone-200 sticky top-0 z-40"><div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="bg-[#7C1D2E] p-2 rounded-xl text-[#D4A843]"><BarChart3 className="h-5 w-5" /></div><b className="text-xl text-[#5A1420]">Procuremate<span className="text-[#D4A843]">SU</span></b><span className="text-xs bg-red-50 text-[#7C1D2E] border border-red-200 px-2 py-1 rounded-full font-semibold">Monitoring</span></div><Link href="/admin" className="text-sm text-stone-600 hover:text-[#7C1D2E] flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Back to Admin</Link></div></nav>
      <main className="max-w-7xl mx-auto px-4 py-7">
        <div className="mb-6"><h1 className="text-3xl font-extrabold text-[#5A1420]">Procurement Monitoring</h1><p className="text-stone-600 mt-1">Search, filter, and identify Purchase Requests that may need administrative attention.</p></div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Metric label="Total PRs" value={metrics.total} icon={<BarChart3 className="h-4 w-4" />} />
          <Metric label="Active" value={metrics.active} icon={<Clock className="h-4 w-4" />} />
          <Metric label="Approaching" value={metrics.approaching} icon={<ShieldAlert className="h-4 w-4" />} />
          <Metric label="Delayed" value={metrics.delayed} icon={<AlertTriangle className="h-4 w-4" />} danger />
        </div>

        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4 font-bold text-[#5A1420]"><SlidersHorizontal className="h-4 w-4" />Advanced Search & Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="lg:col-span-2 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="PR no., requester, department, purpose..." className="w-full pl-9 pr-3 py-2.5 border rounded-xl" /></label>
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl"><option value="all">All stages</option>{stageOptions.map(s => <option key={s.key} value={s.key}>Step {stageNumber(s.key)} — {s.label}</option>)}</select>
            <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl"><option value="all">All departments</option>{departments.map(d => <option key={d}>{d}</option>)}</select>
            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl"><option value="all">All processing conditions</option><option value="on-track">On track</option><option value="approaching">Approaching attention threshold</option><option value="delayed">Potentially delayed</option></select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" title="From date" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" title="To date" />
            <input type="number" min="0" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="Minimum amount" className="w-full px-3 py-2.5 border rounded-xl" />
            <input type="number" min="0" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="Maximum amount" className="w-full px-3 py-2.5 border rounded-xl" />
          </div>
          <div className="mt-3 text-xs text-stone-500 flex items-center gap-2"><Filter className="h-3.5 w-3.5" />Showing {filtered.length} of {prs.length} Purchase Requests. Monitoring thresholds are system heuristics, not official MSU SLAs.</div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 font-bold text-[#5A1420]">Procurement Records</div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#FBF7F2] text-stone-600"><tr><th className="text-left px-5 py-3">PR</th><th className="text-left px-5 py-3">Requester / Department</th><th className="text-left px-5 py-3">Current Stage</th><th className="text-right px-5 py-3">Amount</th><th className="text-left px-5 py-3">Processing</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-stone-100">{filtered.map(pr => { const latest = latestStage.get(pr.pr_no); const risk = riskFor(pr, latest); const age = latest ? daysSince(latest.completed_at) : daysSince(pr.created_at); return <tr key={pr.pr_no} className="hover:bg-stone-50"><td className="px-5 py-4"><div className="font-bold text-[#5A1420]">{pr.pr_no}</div><div className="text-xs text-stone-500 max-w-xs truncate">{pr.purpose}</div></td><td className="px-5 py-4"><div className="font-medium">{pr.printed_name}</div><div className="text-xs text-stone-500">{pr.department}</div></td><td className="px-5 py-4"><span className="text-xs font-semibold">Step {stageNumber(pr.current_stage) || "—"}</span><div className="text-xs text-stone-500 max-w-xs">{stageLabel(pr.current_stage)}</div></td><td className="px-5 py-4 text-right font-semibold">₱{Number(pr.total || 0).toLocaleString()}</td><td className="px-5 py-4"><RiskBadge risk={risk} age={age} /></td><td className="px-5 py-4 text-right"><Link href={`/dashboard/pr/${encodeURIComponent(pr.pr_no)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C1D2E] hover:underline"><Eye className="h-3.5 w-3.5" />View</Link></td></tr> })}</tbody></table>{filtered.length === 0 && <div className="py-14 text-center text-sm text-stone-500">No Purchase Requests match the selected filters.</div>}</div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, icon, danger }: { label: string; value: number; icon: React.ReactNode; danger?: boolean }) { return <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm"><div className={`flex items-center gap-2 text-xs font-semibold ${danger ? "text-red-700" : "text-stone-500"}`}>{icon}{label}</div><div className={`mt-1 text-2xl font-extrabold ${danger ? "text-red-700" : "text-[#5A1420]"}`}>{value}</div></div>; }
function RiskBadge({ risk, age }: { risk: Risk; age: number }) { const config = risk === "delayed" ? { label: "Potentially delayed", cls: "bg-red-50 text-red-700 border-red-200" } : risk === "approaching" ? { label: "Approaching threshold", cls: "bg-amber-50 text-amber-700 border-amber-200" } : { label: "On track", cls: "bg-green-50 text-green-700 border-green-200" }; return <div><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${config.cls}`}>{risk === "delayed" ? <AlertTriangle className="h-3 w-3" /> : risk === "approaching" ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}{config.label}</span><div className="text-[10px] text-stone-400 mt-1">{age.toFixed(1)} days at latest recorded point</div></div>; }
