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

export default function RFQEditorModal({ prNo, onClose, onSaved }: { prNo: string; onClose: () => void; onSaved?: () => void }) {
  const [form, setForm] = useState<RFQFormDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/admin/rfq?prNo=${encodeURIComponent(prNo)}`, { credentials: "include" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load the RFQ.");
        if (active) setForm(data.formData as RFQFormDraft);
      } catch (e: any) {
        if (active) setError(e?.message || "Unable to load the RFQ.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [prNo]);

  const total = useMemo(() => form?.items.reduce((sum, item) => sum + Number(item.abc || 0), 0) || 0, [form]);
  const lessThan50k = total < 50000;

  const setField = (key: keyof RFQFormDraft, value: string) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setSaved(false);
  };

  const setItem = (index: number, key: keyof RFQItemDraft, value: string | number) => {
    setForm((current) => {
      if (!current) return current;
      const items = current.items.map((item, i) => i === index ? { ...item, [key]: value } : item);
      return { ...current, items, total_abc: items.reduce((sum, item) => sum + Number(item.abc || 0), 0) };
    });
    setSaved(false);
  };

  const addItem = () => setForm((current) => current ? {
    ...current,
    items: [...current.items, { item: current.items.length + 1, quantity: 0, abc: 0, technical_specifications: "", supplier_unit: "", supplier_unit_price: "", supplier_total_amount: "" }],
  } : current);

  const removeItem = (index: number) => setForm((current) => {
    if (!current || current.items.length <= 1) return current;
    const items = current.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, item: i + 1 }));
    return { ...current, items, total_abc: items.reduce((sum, item) => sum + Number(item.abc || 0), 0) };
  });

  const save = async (printAfter = false) => {
    if (!form || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/rfq", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prNo, formData: form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save RFQ corrections.");
      setForm(data.formData as RFQFormDraft);
      setSaved(true);
      onSaved?.();
      if (printAfter) window.setTimeout(() => window.print(), 300);
    } catch (e: any) {
      setError(e?.message || "Unable to save RFQ corrections.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center"><div className="bg-white rounded-xl p-8 flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-[#7C1D2E]" />Loading official RFQ...</div></div>;
  }

  if (!form) {
    return <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-xl p-6 max-w-md"><h3 className="font-bold text-[#7C1D2E]">RFQ unavailable</h3><p className="text-sm text-stone-600 mt-2">{error}</p><button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-[#7C1D2E] text-white">Close</button></div></div>;
  }

  const input = "w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#7C1D2E]";

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-7xl max-h-[96vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div><h2 className="text-xl font-extrabold text-[#5A1420]">RFQ Form — {prNo}</h2><p className="text-xs text-stone-500">Automatically filled from the Purchase Request. Correct any errors before saving or printing.</p></div>
          <div className="flex items-center gap-2"><span className={`px-3 py-1.5 rounded-full text-xs font-bold ${lessThan50k ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>{lessThan50k ? "RFQ LESS THAN 50 K" : "RFQ MORE THAN 50K"}</span><button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"><X className="h-5 w-5" /></button></div>
        </header>

        <main className="overflow-y-auto bg-stone-100 p-4 sm:p-6">
          <section id="official-rfq-print" className="mx-auto max-w-6xl bg-white text-black border border-stone-300 shadow-sm p-6 print:border-0 print:shadow-none">
            <div className="text-center font-bold text-lg">MINDANAO STATE UNIVERSITY</div>
            <div className="text-center font-bold text-sm">Fatima, General Santos City</div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] border border-black mt-2">
              <div className="flex items-center justify-center min-h-[70px]"><div className="text-center font-extrabold text-xl">REQUEST FOR QUOTATION</div></div>
              <div className="border-t lg:border-t-0 lg:border-l border-black">
                <label className="grid grid-cols-[105px_1fr] border-b border-black text-xs"><span className="p-2">Reference Nos.</span><input className={input} value={form.reference_no} onChange={e => setField("reference_no", e.target.value)} /></label>
                <label className="grid grid-cols-[105px_1fr] border-b border-black text-xs"><span className="p-2">Project Name:</span><input className={input} value={form.project_name} onChange={e => setField("project_name", e.target.value)} /></label>
                <label className="grid grid-cols-[105px_1fr] text-xs"><span className="p-2">Location:</span><input className={input} value={form.location} onChange={e => setField("location", e.target.value)} /></label>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] border-x border-b border-black">
              <div className="p-3 space-y-1 text-sm"><input className={input} value={form.company_name} onChange={e => setField("company_name", e.target.value)} placeholder="Company Name" /><div className="text-xs">Company Name</div><input className={input} value={form.address} onChange={e => setField("address", e.target.value)} placeholder="Address" /><div className="text-xs">Address</div></div>
              <div className="border-t lg:border-t-0 lg:border-l border-black p-3 space-y-3 text-xs"><label className="flex items-center gap-2"><span className="w-24">Date :</span><input type="date" className={input} value={form.rfq_date} onChange={e => setField("rfq_date", e.target.value)} /></label><label className="flex items-center gap-2"><span className="w-24">Quotation No. :</span><input className={input} value={form.quotation_no} onChange={e => setField("quotation_no", e.target.value)} /></label></div>
            </div>

            <div className="border-x border-b border-black p-2 text-xs">Please quote your best proposal for item/s listed below, subject to the Terms and Conditions duly signed by your representative.</div>
            <div className="border-x border-b border-black p-3 text-[10px] leading-tight"><div className="font-bold mb-1">Terms and Conditions:</div>{TERMS.map(term => <div key={term}>{term}</div>)}<div className="font-bold mt-2">Very truly yours,</div><div className="text-center font-bold text-base mt-1">{lessThan50k ? "ENGR. NELSON P. BENARES, JR." : "RANDY P. ASTURIAS, D.Eng."}</div><div className="text-center">{lessThan50k ? "Director, Procurement Management Office" : "BAC Chairman"}</div></div>

            <div className="border-x border-b border-black overflow-x-auto"><table className="w-full border-collapse text-xs min-w-[900px]"><thead><tr><th rowSpan={2} className="border border-black p-2">Item</th><th rowSpan={2} className="border border-black p-2">QTY</th><th rowSpan={2} className="border border-black p-2">ABC</th><th rowSpan={2} className="border border-black p-2">Technical Specifications</th><th colSpan={2} className="border border-black p-2">Unit Price</th><th rowSpan={2} className="border border-black p-2">Total Amount</th><th className="print:hidden border-0" /></tr><tr><th className="border border-black p-2">UNIT</th><th className="border border-black p-2">UNIT PRICE</th></tr></thead><tbody>
              {form.items.map((item, index) => <tr key={index}><td className="border border-black p-1 text-center">{item.item}</td><td className="border border-black p-1"><input className={input} type="number" min="0" value={item.quantity} onChange={e => setItem(index, "quantity", Number(e.target.value))} /></td><td className="border border-black p-1"><input className={input} type="number" min="0" step="0.01" value={item.abc} onChange={e => setItem(index, "abc", Number(e.target.value))} /></td><td className="border border-black p-1"><textarea className={input} rows={2} value={item.technical_specifications} onChange={e => setItem(index, "technical_specifications", e.target.value)} /></td><td className="border border-black p-1"><input className={input} value={item.supplier_unit} onChange={e => setItem(index, "supplier_unit", e.target.value)} /></td><td className="border border-black p-1"><input className={input} value={item.supplier_unit_price} onChange={e => setItem(index, "supplier_unit_price", e.target.value)} /></td><td className="border border-black p-1"><input className={input} value={item.supplier_total_amount} onChange={e => setItem(index, "supplier_total_amount", e.target.value)} /></td><td className="print:hidden p-1"><button type="button" onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button></td></tr>)}
              <tr><td colSpan={4} className="border border-black p-2 text-center font-bold">***NOTHING FOLLOWS***</td><td className="border border-black" /><td className="border border-black" /><td className="border border-black" /><td className="print:hidden" /></tr>
              <tr><td colSpan={4} className="border border-black p-2"><input className={input} value={form.purpose} onChange={e => setField("purpose", e.target.value)} /></td><td colSpan={3} className="border border-black p-2"><input className={input} value={form.office} onChange={e => setField("office", e.target.value)} /></td><td className="print:hidden" /></tr>
              <tr><td colSpan={4} className="border border-black p-2 text-center font-bold">TOTAL ABC</td><td colSpan={3} className="border border-black p-2 text-right font-bold">₱{money(total)}</td><td className="print:hidden" /></tr>
              <tr><td colSpan={2} className="border border-black p-2 text-center font-bold">Instructions:</td><td colSpan={5} className="border border-black p-2 italic"><input className={input} value={form.instructions} onChange={e => setField("instructions", e.target.value)} /></td><td className="print:hidden" /></tr>
            </tbody></table></div>

            <div className="text-right text-xs mt-1">(Please provide complete information below)</div>
            <div className="ml-auto w-full sm:w-[310px] mt-3 space-y-2 text-xs"><label className="flex items-center gap-1">Delivery Period :<Input value={form.delivery_period} onChange={v => setField("delivery_period", v)} /></label><label className="flex items-center gap-1">Warranty:<Input value={form.warranty} onChange={v => setField("warranty", v)} /></label><label className="flex items-center gap-1">Price Validity :<Input value={form.price_validity} onChange={v => setField("price_validity", v)} /></label></div>
            <p className="text-xs mt-8">Unit Purchase/Job Order or a Contract is prepared and executed, this Quotation/Proposal shall be binding upon us. We understand that you are not bound to accept the lowest or any Proposal you may receive.</p>
            <p className="text-xs mt-2">After having carefully read and accepted your General Conditions, I/We quote you on the item at prices noted above.</p>
            <div className="grid grid-cols-2 gap-12 mt-10 text-xs"><div className="text-center"><Input value={form.canvasser_name} onChange={v => setField("canvasser_name", v)} /><div>Signature over printed name of canvasser</div></div><div><Input value={form.bidder_name} onChange={v => setField("bidder_name", v)} /><div>Signature over printed name of bidder</div><div className="mt-1">Tel. No. / Cellphone No.: <Input value={form.bidder_contact} onChange={v => setField("bidder_contact", v)} /></div><div className="mt-1">E-mail address: <Input value={form.bidder_email} onChange={v => setField("bidder_email", v)} /></div></div></div>
          </section>
        </main>

        {error && <div className="px-5 py-2 bg-red-50 text-red-700 text-sm border-t border-red-100 shrink-0">{error}</div>}
        <footer className="px-5 py-3 border-t border-stone-200 bg-white flex flex-wrap justify-between gap-2 shrink-0"><button onClick={addItem} className="px-3 py-2 rounded-lg border border-stone-300 text-sm font-semibold flex items-center gap-1"><Plus className="h-4 w-4" />Add Item</button><div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">Close</button><button onClick={() => save(false)} disabled={saving} className="px-4 py-2 rounded-lg bg-[#7C1D2E] text-white text-sm font-bold flex items-center gap-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? "Saving..." : saved ? "Saved" : "Save Corrections"}</button><button onClick={() => save(true)} disabled={saving} className="px-4 py-2 rounded-lg bg-[#D4A843] text-[#5A1420] text-sm font-bold flex items-center gap-1"><Printer className="h-4 w-4" />Save & Print</button></div></footer>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } #official-rfq-print, #official-rfq-print * { visibility: visible !important; } #official-rfq-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; } input, textarea { border: 0 !important; background: transparent !important; box-shadow: none !important; } }`}</style>
    </div>
  );
}
