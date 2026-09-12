"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RFQActionButton from "@/components/RFQActionButton";
import { supabase } from "@/lib/supabase/client";
import { PROCUREMENT_STAGES } from "@/lib/procurement-process";
import { ArrowLeft, FileCheck2, Loader2, Search } from "lucide-react";

interface PR {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  department: string;
  created_at: string;
}

const RFQ_STAGES = new Set(["rfq_generation", "rfq_evaluation", "rfq_printing"]);
const STAGES = PROCUREMENT_STAGES;

function stageLabel(stage: string) {
  return STAGES.find((item) => item.key === stage)?.label || stage;
}

export default function AdminRFQPage() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("users").select("role,status,is_active").eq("id", user.id).single();
    if (profile?.role !== "admin" || profile.status !== "approved" || profile.is_active !== true) return;
    const { data } = await supabase.from("purchase_requests").select("pr_no,purpose,total,current_stage,department,created_at").in("current_stage", Array.from(RFQ_STAGES)).order("created_at", { ascending: false });
    setPrs((data || []) as PR[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase.channel("admin-rfq-workspace")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "rfqs" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => prs.filter((pr) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || pr.pr_no.toLowerCase().includes(q) || pr.purpose.toLowerCase().includes(q) || pr.department.toLowerCase().includes(q);
    const matchesStage = filter === "all" || pr.current_stage === filter;
    return matchesSearch && matchesStage;
  }), [prs, search, filter]);

  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800">
      <nav className="bg-white/95 border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg text-stone-500 hover:text-[#7C1D2E] hover:bg-stone-50" title="Back to Admin Dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            <div className="bg-[#7C1D2E] p-2 rounded-xl text-[#D4A843]"><FileCheck2 className="h-5 w-5" /></div>
            <div><b className="text-xl text-[#5A1420]">RFQ Workspace</b><p className="text-[11px] text-stone-500">Official MSU-Gensan RFQ generation, evaluation, and printing</p></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-7">
        <div className="mb-6"><h1 className="text-3xl font-extrabold text-[#5A1420]">Requests for Quotation</h1><p className="text-stone-600 mt-1">Step 7: complete the RFQ → Step 8: review/evaluate the RFQ → Step 9: print the RFQ.</p></div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-5 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PR number, purpose, or department" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-200 bg-white text-gray-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E]" /></div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-gray-900">
            <option value="all">All RFQ stages</option><option value="rfq_generation">Step 7 — RFQ Generation</option><option value="rfq_evaluation">Step 8 — RFQ Evaluation</option><option value="rfq_printing">Step 9 — RFQ/SVP Printing</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {loading ? <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#7C1D2E]" /></div> : filtered.length === 0 ? <div className="p-12 text-center text-stone-500">No Purchase Requests are currently in the RFQ stages.</div> : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-stone-50"><tr>{["PR #", "Purpose", "Department", "ABC", "Current Stage", "Action"].map((header) => <th key={header} className="px-5 py-3 text-left text-xs uppercase tracking-wide text-stone-500 font-semibold">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-stone-100">{filtered.map((pr) => (
                <tr key={pr.pr_no} className="hover:bg-stone-50/70">
                  <td className="px-5 py-4 text-sm font-bold text-[#7C1D2E] whitespace-nowrap">{pr.pr_no}</td>
                  <td className="px-5 py-4 text-sm max-w-md">{pr.purpose}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{pr.department}</td>
                  <td className="px-5 py-4 text-sm font-medium whitespace-nowrap">₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-4 text-sm"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${pr.current_stage === "rfq_generation" ? "bg-amber-50 text-amber-800 border-amber-200" : pr.current_stage === "rfq_evaluation" ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-green-50 text-green-800 border-green-200"}`}>{stageLabel(pr.current_stage)}</span></td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {pr.current_stage === "rfq_generation" ? <RFQActionButton prNo={pr.pr_no} mode="generate" /> : pr.current_stage === "rfq_evaluation" ? <RFQActionButton prNo={pr.pr_no} mode="review" /> : <RFQActionButton prNo={pr.pr_no} mode="print" />}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </main>
    </div>
  );
}