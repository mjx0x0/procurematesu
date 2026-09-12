"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Printer, Save, Trash2, X } from "lucide-react";

export type RFQItemDraft = {
  item: number;
  quantity: number;
  abc: number;
  technical_specifications: string;
  supplier_unit: string;
  supplier_unit_price: string;
  supplier_total_amount: string;
};

export type RFQFormDraft = {
  reference_no: string;
  project_name: string;
  location: string;
  rfq_date: string;
  quotation_no: string;
  company_name: string;
  address: string;
  items: RFQItemDraft[];
  purpose: string;
  office: string;
  total_abc: number;
  instructions: string;
  delivery_period: string;
  warranty: string;
  price_validity: string;
  bidder_name: string;
  bidder_contact: string;
  bidder_email: string;
  canvasser_name: string;
};

const TERMS = [
  "1. Mayor's/Business Permit",
  "2. Philgeps Registration Certificate",
  "3. Supplier/Bidder previously submitted documentary requirements may not submit.",
  "4. All entries shall be typed or written in a clear legible manner",
  "5. No alternate quotation/offer is allowed, suppliers who submitted more than one quotation shall be automatically disqualified.",
  "6. All prices offered herein are valid, binding and effective for THIRTY (30) calendar days upon issuance of this document. Alternate bids shall be rejected.",
  "7. Delivery period within fifteen (15) Calendar Days",
  "8. Price validity shall be for period of thirty (30) Calendar Days.",
  "9. Bidders shall submit original brochures showing certifications of the product being offered.",
  "10. In case suppliers pro forma quotation is submitted, conditions will be governed by the submitted signed Terms of Reference/Technical Specifications.",
  "11. Partial bid is allowed, evaluation, comparison and contract award shall be made PER ITEM; partial bid is not allowed; the goods are grouped in a single lot, evaluation, comparison, and contract award shall be made PER LOT",
];

const money = (n: number) => Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (v: string) => v ? new Date(`${v}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

export default function RFQEditorModal({ prNo, onClose, onSaved }: { prNo: string; onClose: () => void; onSaved?: () => void }) {
  const [form, setForm] = useState<RFQFormDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/rfq?prNo=${encodeURIComponent(prNo)}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load the RFQ.");
        if (alive) setForm(data.formData as RFQFormDraft);
      } catch (e: any) {
        if (alive) setError(e?.message || "Unable to load the RFQ.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [prNo]);

  const total = useMemo(() => form?.items.reduce((s, i) => s + Number(i.abc || 0), 0) || 0, [form]);
  const lessThan50k = total < 50000;

  const setField = (key: keyof RFQFormDraft, value: string) => setForm((f) => f ? { ...f, [key]: value } : f);
  const setItem = (index: number, key: keyof RFQItemDraft, value: string | number) => setForm((f) => {
    if (!f) return f;
    const items = f.items.map((it, i) => i === index ? { ...it, [key]: value } : it);
    return { ...f, items, total_abc: items.reduce((s, it) => s + Number(it.abc || 0), 0) };
  });
  const addItem = () => setForm((f) => f ? { ...f, items: [...f.items, { item: f.items.length + 1, quantity: 0, abc: 0, technical_specifications: "", supplier_unit: "", supplier_unit_price: "", supplier_total_amount: "" }] } : f);
  const removeItem = (index: number) => setForm((f) => f ? { ...f, items: f.items.filter((_, i) => i !== index).map((it, i) => ({ ...it, item: i + 1 })), total_abc: f.items.filter((_, i) => i !== index).reduce((s, it) => s + Number(it.abc || 0), 0) } : f);

  const save = async (printAfter = false) => {
    if (!form || saving) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/admin/rfq", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prNo, formData: form }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save RFQ corrections.");
      setForm(data.formData); setSaved(true); onSaved?.();
      if (printAfter) window.setTimeout(() => window.print(), 250);
    } catch (e: any) { setError(e?.message || "Unable to save RFQ corrections."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center"><div className="bg-white rounded-2xl p-8 flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-[#7C1D2E]" />Loading official RFQ...</div></div>;
  if (!form) return <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 max-w-md"><p className="font-bold text-[#7C1D2E]">RFQ unavailable</p><p className="text-sm text-stone-600 mt-2">{error}</p><button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-[#7C1D2E] text-white">Close</button></div></div>;

  const input = "w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7C1D2E]/20 focus:border-[#7C1D2E]";
  const staticInput = "w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-sm text-stone-600";

  return <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
    <div className="w-full max-w-6xl max-h-[96vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <div className="shrink-0 px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-white">
        <div><h2 className="text-xl font-extrabold text-[#5A1420]">RFQ Form — {prNo}</h2><p className="text-xs text-stone-500 mt-0.5">Auto-filled from the Purchase Request. Correct any errors before saving or printing.</p></div>
        <div className="flex items-center gap-2"><span className={`px-3 py-1.5 rounded-full text-xs font-bold ${lessThan50k ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>{lessThan50k ? "RFQ LESS THAN 50 K" : "RFQ MORE THAN 50K"}</span><button onClick={onClose} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button></div>
      </div>

      <div className="overflow-y-auto p-4 sm:p-6 bg-stone-100">
        <div id="official-rfq-print" className="mx-auto max-w-[900px] bg-white text-black shadow-sm border border-stone-300 p-6 sm:p-8 print:shadow-none print:border-0 print:p-0">
          <div className="text-center font-bold text-lg">MINDANAO STATE UNIVERSITY</div>
          <div className="text-center font-bold text-sm">Fatima, General Santos City</div>
          <div className="grid grid-cols-[1fr_280px] mt-2 border border-black">
            <div className="p-3 flex items-center"><div className="w-full text-center font-extrabold text-xl">REQUEST FOR QUOTATION</div></div>
            <div className="border-l border-black text-sm"><label className="grid grid-cols-[105px_1fr] border-b border-black"><span className="p-1.5">Reference Nos.</span><input className={input} value={form.reference_no} onChange={e => setField("reference_no", e.target.value)} /></label><label className="grid grid-cols-[105px_1fr] border-b border-black"><span className="p-1.5">Project Name:</span><input className={input} value={form.project_name} onChange={e => setField("project_name", e.target.value)} /></label><label className="grid grid-cols-[105px_1fr]"><span className="p-1.5">Location:</span><input className={input} value={form.location} onChange={e => setField("location", e.target.value)} /></label></div>
          </div>

          <div className="grid grid-cols-[1fr_280px] border-x border-b border-black text-sm"><div className="p-3 space-y-1"><label className="block"><input className={input} value={form.company_name} onChange={e => setField("company_name", e.target.value)} placeholder="Company Name" /></label><div className="text-xs">Company Name</div><label className="block"><input className={input} value={form.address} onChange={e => setField("address", e.target.value)} placeholder="Address" /></label><div className="text-xs">Address</div></div><div className="border-l border-black p-3 space-y-3"><label className="flex gap-2 items-center"><span className="w-24">Date :</span><input type="date" className={input} value={form.rfq_date} onChange={e => setField("rfq_date", e.target.value)} /></label><label className="flex gap-2 items-center"><span className="w-24">Quotation No. :</span><input className={input} value={form.quotation_no} onChange={e => setField("quotation_no", e.target.value)} /></label></div></div>

          <p className="border-x border-b border-black p-2 text-xs">Please quote your best proposal for item/s listed below, subject to the Terms and Conditions duly signed by your representative.</p>
          <div className="border-x border-b border-black p-3 text-[11px] leading-tight"><b>Terms and Conditions:</b>{TERMS.map(t => <div key={t}>{t}</div>)}<div className="mt-2 font-bold">Very truly yours,</div><div className="text-center text-base font-bold mt-1">{lessThan50k ? "ENGR. NELSON P. BENARES, JR." : "RANDY P. ASTURIAS, D.Eng."}</div><div className="text-center">{lessThan50k ? "Director, Procurement Management Office" : "BAC Chairman"}</div></div>

          <div className="border-x border-b border-black overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr><th rowSpan={2} className="border border-black p-1">Item</th><th rowSpan={2} className="border border-black p-1">QTY</th><th rowSpan={2} className="border border-black p-1">ABC</th><th rowSpan={2} className="border border-black p-1">Technical Specifications</th><th colSpan={2} className="border border-black p-1">Unit Price</th><th rowSpan={2} className="border border-black p-1">Total Amount</th></tr><tr><th className="border border-black p-1">UNIT</th><th className="border border-black p-1">UNIT PRICE</th></tr></thead><tbody>{form.items.map((it, i) => <tr key={i}><td className="border border-black p-1 text-center">{it.item}</td><td className="border border-black p-1"><input className={input} type="number" min="0" value={it.quantity} onChange={e => setItem(i, "quantity", Number(e.target.value))} /></td><td className="border border-black p-1"><input className={input} type="number" min="0" step="0.01" value={it.abc} onChange={e => setItem(i, "abc", Number(e.target.value))} /></td><td className="border border-black p-1"><textarea className={input} rows={2} value={it.technical_specifications} onChange={e => setItem(i, "technical_specifications", e.target.value)} /></td><td className="border border-black p-1"><input className={input} value={it.supplier_unit} onChange={e => setItem(i, "supplier_unit", e.target.value)} /></td><td className="border border-black p-1"><input className={input} value={it.supplier_unit_price} onChange={e => setItem(i, "supplier_unit_price", e.target.value)} /></td><td className="border border-black p-1"><input className={input} value={it.supplier_total_amount} onChange={e => setItem(i, "supplier_total_amount", e.target.value)} /></td><td className="border-0 p-1 print:hidden"><button onClick={() => removeItem(i)} className="p-1 text-red-500"><Trash2 className="h-4 w-4" /></button></td></tr>)}<tr><td colSpan={4} className="border border-black p-2 text-center font-bold">***NOTHING FOLLOWS***</td><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /></tr><tr><td colSpan={4} className="border border-black p-2 text-center"><input className={input} value={form.purpose} onChange={e => setField("purpose", e.target.value)} placeholder="(Purpose)" /></td><td colSpan={3} className="border border-black p-2"><input className={input} value={form.office} onChange={e => setField("office", e.target.value)} placeholder="(Office)" /></td></tr><tr><td colSpan={4} className="border border-black p-2 text-center"><span className="font-bold">TOTAL ABC</span></td><td colSpan={3} className="border border-black p-2 text-right font-bold">₱{money(total)}</td></tr><tr><td colSpan={2} className="border border-black p-2 text-center font-bold">Instructions:</td><td colSpan={5} className="border border-black p-2 italic"><input className={input} value={form.instructions} onChange={e => setField("instructions", e.target.value)} /></td></tr></tbody></table></div>

          <div className="text-right text-xs mt-1">(Please provide complete information below)</div><div className="ml-auto w-[280px] mt-3 text-xs space-y-2"><label className="flex gap-1">Delivery Period :<input className={input} value={form.delivery_period} onChange={e => setField("delivery_period", e.target.value)} /></label><label className="flex gap-1">Warranty:<input className={input} value={form.warranty} onChange={e => setField("warranty", e.target.value)} /></label><label className="flex gap-1">Price Validity :<input className={input} value={form.price_validity} onChange={e => setField("price_validity", e.target.value)} /></label></div>
          <p className="text-xs mt-8">Unit Purchase/Job Order or a Contract is prepared and executed, this Quotation/Proposal shall be binding upon us. We understand that you are not bound to accept the lowest or any Proposal you may receive.</p><p className="text-xs mt-2">After having carefully read and accepted your General Conditions, I/We quote you on the item at prices noted above.</p>
          <div className="grid grid-cols-2 gap-12 mt-10 text-xs"><div className="text-center"><input className={input} value={form.canvasser_name} onChange={e => setField("canvasser_name", e.target.value)} placeholder="Signature over printed name of canvasser" /><div>Signature over printed name of canvasser</div></div><div><input className={input} value={form.bidder_name} onChange={e => setField("bidder_name", e.target.value)} /><div>Signature over printed name of bidder</div><div className="mt-1">Tel. No. / Cellphone No.: <input className="border-b border-black outline-none" value={form.bidder_contact} onChange={e => setField("bidder_contact", e.target.value)} /></div><div className="mt-1">E-mail address: <input className="border-b border-black outline-none" value={form.bidder_email} onChange={e => setField("bidder_email", e.target.value)} /></div></div></div>
        </div>
      </div>

      {error && <div className="shrink-0 px-5 py-2 bg-red-50 text-red-700 text-sm border-t border-red-100">{error}</div>}
      <div className="shrink-0 px-5 py-3 border-t border-stone-200 bg-white flex flex-wrap justify-between gap-2"><div className="flex gap-2"><button onClick={addItem} className="px-3 py-2 rounded-lg border border-stone-300 text-sm font-semibold flex items-center gap-1"><Plus className="h-4 w-4" />Add Item</button><span className="self-center text-xs text-stone-500">Template switches automatically at ₱50,000 ABC.</span></div><div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">Cancel</button><button onClick={() => save(false)} disabled={saving} className="px-4 py-2 rounded-lg bg-[#7C1D2E] text-white text-sm font-bold flex items-center gap-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? "Saving..." : saved ? "Saved" : "Save Corrections"}</button><button onClick={() => save(true)} disabled={saving} className="px-4 py-2 rounded-lg bg-[#D4A843] text-[#5A1420] text-sm font-bold flex items-center gap-1"><Printer className="h-4 w-4" />Save & Print</button></div></div>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } #official-rfq-print, #official-rfq-print * { visibility: visible !important; } #official-rfq-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; } input, textarea { border: 0 !important; background: transparent !important; padding: 0 !important; box-shadow: none !important; } .print\\:hidden { display: none !important; } }`}</style>
    </div>;
}
