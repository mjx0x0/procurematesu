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
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl text-stone-500 hover:text-[#7B0046] hover:bg-stone-100 transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-[#4D002C] p-2 rounded-xl text-amber-300 shadow-sm">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <b className="text-xl font-black text-[#4D002C]">
                  RFQ <span className="text-[#F5AB26]">Workspace</span>
                </b>
                <span className="text-[11px] bg-red-50 text-[#7B0046] border border-red-200/80 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Admin Tool
                </span>
              </div>
              <p className="text-[10px] text-stone-500">Official MSU-GenSan RFQ generation, evaluation, and printing</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs font-bold text-stone-600 hover:text-[#7B0046] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-7">
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-[#4D002C]">Requests for Quotation (RFQ)</h1>
          <p className="text-sm text-stone-600 mt-1">
            Official PMO Sequence: <b>Step 7</b> (Generate RFQ) → <b>Step 8</b> (Evaluate Quotations) → <b>Step 9</b> (Print RFQ).
          </p>
        </div>

        <div className="ui-card p-4 mb-5 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PR number, purpose, or department..."
              className="ui-input w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ui-select px-3 py-2.5 text-sm min-w-[220px]"
          >
            <option value="all">All RFQ Stages</option>
            <option value="rfq_generation">Step 7 — RFQ Generation</option>
            <option value="rfq_evaluation">Step 8 — RFQ Evaluation</option>
            <option value="rfq_printing">Step 9 — RFQ/SVP Printing</option>
          </select>
        </div>

        <div className="ui-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#7B0046]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-stone-500">
              <FileCheck2 className="h-10 w-10 mx-auto text-stone-300 mb-2" />
              <p className="font-semibold">No Purchase Requests are currently in the RFQ stages.</p>
              <p className="text-xs text-stone-400 mt-1">Purchase Requests at Steps 7, 8, and 9 will automatically appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    {["PR Number", "Purpose / Project", "Department", "Approved Budget (ABC)", "Current Stage", "Action"].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-5 py-3.5 text-left text-[11px] uppercase tracking-wider text-stone-500 font-bold"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((pr) => (
                    <tr key={pr.pr_no} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-4 text-sm font-bold text-[#7B0046] whitespace-nowrap">{pr.pr_no}</td>
                      <td className="px-5 py-4 text-sm max-w-md font-medium text-stone-900">{pr.purpose}</td>
                      <td className="px-5 py-4 text-sm text-stone-600 whitespace-nowrap">{pr.department}</td>
                      <td className="px-5 py-4 text-sm font-bold text-stone-800 whitespace-nowrap">
                        ₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border inline-block whitespace-nowrap ${
                            pr.current_stage === "rfq_generation"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : pr.current_stage === "rfq_evaluation"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {stageLabel(pr.current_stage)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {pr.current_stage === "rfq_generation" ? (
                          <RFQActionButton prNo={pr.pr_no} mode="generate" />
                        ) : pr.current_stage === "rfq_evaluation" ? (
                          <RFQActionButton prNo={pr.pr_no} mode="review" />
                        ) : (
                          <RFQActionButton prNo={pr.pr_no} mode="print" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}