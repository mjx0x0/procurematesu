"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Printer, X } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";

interface PRItem { item_description?: string; quantity?: number; unit?: string; stock_no?: string; unit_cost?: number; total_cost?: number; [key: string]: unknown; }
interface PRRecord { [key: string]: unknown; pr_no?: string; department?: string; section?: string; purpose?: string; pr_date?: string; sai_no?: string; sai_date?: string; alobs_no?: string; alobs_date?: string; printed_name?: string; designation?: string; approved_by?: string; approved_by_designation?: string; total?: number; }
interface Props { prNo: string; onClose: () => void; }

const money = (v: unknown) => Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.total_cost || 0), 0) || Number(pr?.total || 0), [items, pr]);
  const visibleMeta = useMemo(() => {
    if (!pr) return [];
    const hidden = new Set(["id", "user_id", "created_at", "updated_at", "current_stage", "current_status", "total"]);
    return Object.entries(pr).filter(([key, value]) => !hidden.has(key) && value !== null && value !== undefined && value !== "");
  }, [pr]);
  const currentDate = pr?.pr_date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const blankRows = Math.max(0, 6 - items.length);
  const printedName = pr?.printed_name && String(pr.printed_name).includes("@") ? String(pr.printed_name).split("@")[0].replace(/[._]/g, " ") : String(pr?.printed_name || "");

  if (loading) return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60"><div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5"><Loader2 className="h-5 w-5 animate-spin text-[#7C1D2E]" />Loading complete Purchase Request...</div></div>;
  if (!pr) return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"><div className="max-w-md rounded-2xl bg-white p-6"><h3 className="font-bold text-[#7C1D2E]">Purchase Request unavailable</h3><p className="mt-2 text-sm text-stone-600">{error}</p><button onClick={onClose} className="mt-4 rounded-lg bg-[#7C1D2E] px-4 py-2 text-white">Close</button></div></div>;

  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
    <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-stone-100 shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#7C1D2E] p-2 text-[#D4A843]"><FileText className="h-5 w-5" /></div><div><h2 className="text-lg font-extrabold text-[#5A1420]">Complete Purchase Request — {prNo}</h2><p className="text-xs text-stone-500">Read-only copy of the end-user&apos;s submitted PR for verification.</p></div></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X className="h-5 w-5" /></button></header>

      <div className="overflow-y-auto p-4 sm:p-6">
        <div id="admin-pr-print" className="mx-auto max-w-4xl bg-white text-black shadow-sm print:border-0 print:shadow-none">
          <div className="border-2 border-black text-black">
            <div className="relative border-b-2 border-black px-4 py-3 text-center"><div className="absolute left-3 top-1/2 -translate-y-1/2"><MsuLogo size={42} /></div><h1 className="font-serif text-xl font-black uppercase tracking-wider">PURCHASE REQUEST</h1><p className="mt-0.5 font-serif text-sm font-bold tracking-wide">MINDANAO STATE UNIVERSITY - General Santos City</p></div>

            {/* Standard header. SAI No. and ALOBS No. are retained as blank fields. */}
            <div className="grid grid-cols-12 border-b-2 border-black text-xs">
              <div className="col-span-6 border-r-2 border-black p-3"><div className="flex min-h-[27px] items-end"><span className="w-24 shrink-0 font-semibold">Department</span><span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold uppercase">{String(pr.department || "")}</span></div><div className="mt-1 flex min-h-[27px] items-end"><span className="w-24 shrink-0 font-semibold">Section</span><span className="flex-1 border-b border-black pl-2 pb-0.5 font-medium">{String(pr.section || "")}</span></div></div>
              <div className="col-span-6 p-3">
                <div className="grid min-h-[27px] grid-cols-12 items-end gap-2"><div className="col-span-7 flex items-end"><span className="w-16 shrink-0 font-semibold">PR No.</span><span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold">{String(pr.pr_no || "DRAFT")}</span></div><div className="col-span-5 flex items-end"><span className="w-10 shrink-0 font-semibold">Date</span><span className="flex-1 border-b border-black pl-1 pb-0.5 text-center font-medium">{currentDate}</span></div></div>
                <div className="mt-1 grid min-h-[27px] grid-cols-12 items-end gap-2"><div className="col-span-7 flex items-end"><span className="w-16 shrink-0 font-semibold">SAI No.</span><span className="min-h-[20px] flex-1 border-b border-black pl-2 pb-0.5" /></div><div className="col-span-5 flex items-end"><span className="w-10 shrink-0 font-semibold">Date</span><span className="min-h-[20px] flex-1 border-b border-black pl-1 pb-0.5" /></div></div>
                <div className="mt-1 grid min-h-[27px] grid-cols-12 items-end gap-2"><div className="col-span-7 flex items-end"><span className="w-16 shrink-0 font-semibold">ALOBS No.</span><span className="min-h-[20px] flex-1 border-b border-black pl-2 pb-0.5" /></div><div className="col-span-5 flex items-end"><span className="w-10 shrink-0 font-semibold">Date</span><span className="min-h-[20px] flex-1 border-b border-black pl-1 pb-0.5" /></div></div>
              </div>
            </div>

            <div className="grid grid-cols-12 border-b-2 border-black text-center text-xs font-bold"><div className="col-span-1 border-r-2 border-black px-1 py-2">Quantity</div><div className="col-span-1 border-r-2 border-black px-1 py-2">Unit</div><div className="col-span-5 border-r-2 border-black px-2 py-2 italic">ITEM DESCRIPTION</div><div className="col-span-1 border-r-2 border-black px-1 py-2">Stock No.</div><div className="col-span-2 border-r-2 border-black px-1 py-2 italic">Estimated Unit Cost</div><div className="col-span-2 px-1 py-2 italic">Estimated Cost</div></div>

            <div className="text-xs">
              {items.map((item, idx) => <div key={idx} className="grid min-h-[28px] grid-cols-12 items-center border-b border-black"><div className="col-span-1 border-r-2 border-black px-1 py-1.5 text-center font-medium">{item.quantity ?? ""}</div><div className="col-span-1 border-r-2 border-black px-1 py-1.5 text-center font-medium">{String(item.unit || "")}</div><div className="col-span-5 border-r-2 border-black px-2.5 py-1.5">{String(item.item_description || "")}</div><div className="col-span-1 border-r-2 border-black px-1 py-1.5 text-center font-mono text-[11px]">{String(item.stock_no || "")}</div><div className="col-span-2 border-r-2 border-black px-2 py-1.5 text-right font-medium">{item.unit_cost ? money(item.unit_cost) : "-"}</div><div className="col-span-2 px-2 py-1.5 text-right font-semibold">{item.total_cost ? money(item.total_cost) : "-"}</div></div>)}
              <div className="grid min-h-[26px] grid-cols-12 items-center border-b border-black"><div className="col-span-1 border-r-2 border-black py-1" /><div className="col-span-1 border-r-2 border-black py-1" /><div className="col-span-5 border-r-2 border-black py-1 text-center text-[11px] font-bold tracking-wider">****Nothing Follows****</div><div className="col-span-1 border-r-2 border-black py-1" /><div className="col-span-2 border-r-2 border-black py-1" /><div className="col-span-2 py-1" /></div>
              {Array.from({ length: blankRows }).map((_, i) => <div key={`blank-${i}`} className="grid min-h-[26px] grid-cols-12 border-b border-black"><div className="col-span-1 border-r-2 border-black" /><div className="col-span-1 border-r-2 border-black" /><div className="col-span-5 border-r-2 border-black" /><div className="col-span-1 border-r-2 border-black" /><div className="col-span-2 border-r-2 border-black" /><div className="col-span-2" /></div>)}
            </div>

            <div className="grid grid-cols-12 border-b-2 border-black text-xs"><div className="col-span-10 flex items-baseline gap-2 border-r-2 border-black p-2.5"><span className="font-bold italic">Purpose</span><span className="flex-1 font-normal italic">{String(pr.purpose || "")}</span></div><div className="col-span-2 flex items-center justify-end p-2.5 font-bold">{money(total)}</div></div>
            <div className="grid grid-cols-12 border-b-2 border-black text-center text-xs font-bold"><div className="col-span-2 border-r-2 border-black py-1.5" /><div className="col-span-4 border-r-2 border-black py-1.5">REQUESTED BY</div><div className="col-span-6 py-1.5">APPROVED BY</div></div>
            <div className="grid min-h-[112px] grid-cols-12 text-xs"><div className="col-span-2 border-r-2 border-black px-3 py-3 text-left"><div className="mt-5">Signature</div><div className="mt-3">Printed Name</div><div className="mt-2">Designation</div></div><div className="col-span-4 border-r-2 border-black px-3 py-3"><div className="h-[27px]" /><div className="font-bold uppercase">{printedName}</div><div className="mt-2 font-medium">{String(pr.designation || "")}</div></div><div className="col-span-6 flex flex-col items-center justify-end px-3 py-3 text-center"><div className="mb-1 w-64 border-b border-black" /><p className="text-xs font-bold uppercase tracking-tight">{String(pr.approved_by || "Atty. Shidik T. Abantas, MDM, LLM")}</p><p className="text-[11px] text-stone-800">{String(pr.approved_by_designation || "Chancellor")}</p></div></div>
          </div>
        </div>

        <div className="mx-auto mt-5 max-w-4xl rounded-xl border border-stone-200 bg-white p-4 print:hidden"><h3 className="mb-3 text-sm font-extrabold text-[#5A1420]">Submitted PR Record</h3><div className="grid grid-cols-1 gap-2 md:grid-cols-2">{visibleMeta.map(([key, value]) => <div key={key} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2"><div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label(key)}</div><div className="mt-0.5 break-words text-xs text-stone-700">{String(value)}</div></div>)}</div></div>
        <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-stone-200 bg-white p-4 print:hidden"><h3 className="mb-3 text-sm font-extrabold text-[#5A1420]">Procurement History</h3>{history.length ? <div className="space-y-2">{history.map((h, i) => <div key={i} className="flex justify-between gap-4 border-b border-stone-100 pb-2 text-xs"><span className="font-semibold">{h.stage_name}</span><span className="text-stone-500">{h.completed_at ? new Date(h.completed_at).toLocaleString() : ""}</span></div>)}</div> : <p className="text-xs text-stone-500">No completed-stage history recorded.</p>}</div>
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-stone-200 bg-white px-5 py-3 print:hidden"><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#7C1D2E] px-4 py-2.5 text-xs font-bold text-white"><Printer className="h-4 w-4" />Print PR</button><button onClick={onClose} className="rounded-lg border border-stone-200 px-4 py-2.5 text-xs font-bold">Close</button></footer>
    </div>
  </div>;
}
