"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Loader2, Printer, X } from "lucide-react";

interface PRItem { item_description?: string; quantity?: number; unit?: string; stock_no?: string; unit_cost?: number; total_cost?: number; [key: string]: unknown; }
interface PRRecord { [key: string]: unknown; pr_no?: string; department?: string; section?: string; purpose?: string; pr_date?: string; sai_no?: string; sai_date?: string; alobs_no?: string; alobs_date?: string; printed_name?: string; designation?: string; approved_by?: string; approved_by_designation?: string; total?: number; }
interface Props { prNo: string; onClose: () => void; }

const money = (v: unknown) => Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function AdminPRFullFormModal({ prNo, onClose }: Props) {
  const [pr, setPr] = useState<PRRecord | null>(null);
  const [items, setItems] = useState<PRItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/pr-details?prNo=${encodeURIComponent(prNo)}`, { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load the Purchase Request.");
        if (active) { setPr(data.pr); setItems(data.items || []); setHistory(data.history || []); }
      } catch (e: any) { if (active) setError(e?.message || "Unable to load the Purchase Request."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [prNo]);

  const total = useMemo(() => items.reduce((s, item) => s + Number(item.total_cost || 0), 0) || Number(pr?.total || 0), [items, pr]);
  const visibleMeta = useMemo(() => {
    if (!pr) return [];
    const hidden = new Set(["id", "user_id", "created_at", "updated_at", "current_stage", "current_status", "total"]);
    return Object.entries(pr).filter(([k, v]) => !hidden.has(k) && v !== null && v !== undefined && v !== "");
  }, [pr]);

  if (loading) return <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center"><div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-[#7C1D2E]" />Loading complete Purchase Request...</div></div>;
  if (!pr) return <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 max-w-md"><h3 className="font-bold text-[#7C1D2E]">Purchase Request unavailable</h3><p className="text-sm text-stone-600 mt-2">{error}</p><button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-[#7C1D2E] text-white">Close</button></div></div>;

  return <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
    <div className="w-full max-w-6xl max-h-[96vh] bg-stone-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <header className="bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-[#7C1D2E] text-[#D4A843]"><FileText className="h-5 w-5" /></div><div><h2 className="text-lg font-extrabold text-[#5A1420]">Complete Purchase Request — {prNo}</h2><p className="text-xs text-stone-500">Read-only copy of the end-user's submitted PR for verification.</p></div></div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100"><X className="h-5 w-5" /></button>
      </header>
      <div className="overflow-y-auto p-4 sm:p-6">
        <div id="admin-pr-print" className="max-w-4xl mx-auto bg-white border-2 border-black text-black shadow-sm print:shadow-none print:border-0">
          <div className="border-b-2 border-black text-center py-4 px-4"><h1 className="text-xl font-black uppercase tracking-wider font-serif">PURCHASE REQUEST</h1><p className="font-bold text-sm font-serif">MINDANAO STATE UNIVERSITY - General Santos City</p></div>
          <div className="grid grid-cols-2 border-b-2 border-black text-xs">
            <div className="border-r-2 border-black p-4 space-y-3"><Field k="Department" v={pr.department}/><Field k="Section" v={pr.section}/></div>
            <div className="p-4 space-y-3"><Field k="PR No." v={pr.pr_no}/><Field k="Date" v={pr.pr_date}/><Field k="SAI No." v={pr.sai_no}/><Field k="SAI Date" v={pr.sai_date}/><Field k="ALOBS No." v={pr.alobs_no}/><Field k="ALOBS Date" v={pr.alobs_date}/></div>
          </div>
          <table className="w-full border-collapse text-xs"><thead><tr><th className="border-r-2 border-b-2 border-black p-2 w-16">Quantity</th><th className="border-r-2 border-b-2 border-black p-2 w-16">Unit</th><th className="border-r-2 border-b-2 border-black p-2">ITEM DESCRIPTION</th><th className="border-r-2 border-b-2 border-black p-2">Stock No.</th><th className="border-r-2 border-b-2 border-black p-2">Estimated Unit Cost</th><th className="border-b-2 border-black p-2">Estimated Cost</th></tr></thead>
          <tbody>{items.map((item, i) => <tr key={i}><td className="border-r-2 border-b border-black p-2 text-center">{item.quantity ?? ""}</td><td className="border-r-2 border-b border-black p-2 text-center">{String(item.unit || "")}</td><td className="border-r-2 border-b border-black p-2">{String(item.item_description || "")}</td><td className="border-r-2 border-b border-black p-2 text-center">{String(item.stock_no || "")}</td><td className="border-r-2 border-b border-black p-2 text-right">{item.unit_cost ? money(item.unit_cost) : "-"}</td><td className="border-b border-black p-2 text-right">{item.total_cost ? money(item.total_cost) : "-"}</td></tr>)}<tr><td colSpan={3} className="border-r-2 border-black p-3 text-center font-bold">****Nothing Follows****</td><td className="border-r-2 border-black"/><td className="border-r-2 border-black"/><td/></tr></tbody></table>
          <div className="grid grid-cols-12 border-t-2 border-b-2 border-black text-xs"><div className="col-span-10 border-r-2 border-black p-3"><b className="italic">Purpose</b><span className="ml-3">{String(pr.purpose || "")}</span></div><div className="col-span-2 p-3 text-right font-bold">{money(total)}</div></div>
          <div className="grid grid-cols-2 border-b-2 border-black text-xs font-bold text-center"><div className="border-r-2 border-black p-2">REQUESTED BY</div><div className="p-2">APPROVED BY</div></div>
          <div className="grid grid-cols-2 min-h-[120px] text-xs"><div className="border-r-2 border-black p-4 space-y-3"><Field k="Printed Name" v={pr.printed_name}/><Field k="Designation" v={pr.designation}/></div><div className="p-4 flex flex-col justify-end items-center text-center"><div className="w-64 border-b border-black mb-2"/><b>{String(pr.approved_by || "Atty. Shidik T. Abantas, MDM, LLM")}</b><span>{String(pr.approved_by_designation || "Chancellor")}</span></div></div>
        </div>
        <div className="max-w-4xl mx-auto mt-5 bg-white rounded-xl border border-stone-200 p-4 print:hidden"><h3 className="text-sm font-extrabold text-[#5A1420] mb-3">Submitted PR Record</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{visibleMeta.map(([k,v]) => <div key={k} className="rounded-lg bg-stone-50 border border-stone-100 px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">{label(k)}</div><div className="text-xs text-stone-700 break-words mt-0.5">{String(v)}</div></div>)}</div></div>
        <div className="max-w-4xl mx-auto mt-4 bg-white rounded-xl border border-stone-200 p-4 print:hidden"><h3 className="text-sm font-extrabold text-[#5A1420] mb-3">Procurement History</h3>{history.length ? <div className="space-y-2">{history.map((h,i)=><div key={i} className="flex justify-between gap-4 text-xs border-b border-stone-100 pb-2"><span className="font-semibold">{h.stage_name}</span><span className="text-stone-500">{h.completed_at ? new Date(h.completed_at).toLocaleString() : ""}</span></div>)}</div> : <p className="text-xs text-stone-500">No completed-stage history recorded.</p>}</div>
      </div>
      <footer className="bg-white border-t border-stone-200 px-5 py-3 flex justify-end gap-2 shrink-0 print:hidden"><button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#7C1D2E] text-white text-xs font-bold"><Printer className="h-4 w-4"/>Print PR</button><button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-stone-200 text-xs font-bold">Close</button></footer>
    </div>
  </div>;
}

function Field({ k, v }: { k: string; v: unknown }) { return <div className="flex items-end gap-2"><span className="font-semibold whitespace-nowrap">{k}</span><span className="border-b border-black flex-1 min-h-[18px] px-1 font-medium">{v == null ? "" : String(v)}</span></div>; }
