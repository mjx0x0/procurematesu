"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, FileText, Loader2, Plus, Save, Send, Sparkles, Trash2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { firstValidationError, validatePurchaseRequest } from "@/lib/pr-validation";

interface Item {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

const emptyItem = (): Item => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  description: "",
  qty: 1,
  unit: "pcs",
  unit_cost: 0,
  total_cost: 0,
});

export default function ProcurementRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const reviewConfirmedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [form, setForm] = useState({
    purpose: "",
    department: "",
    section: "",
    requested_by_designation: "",
  });
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);
      const name = user.user_metadata?.full_name || "";
      setUserName(name && !name.includes("@") ? name : "");
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!searchParams) return;
    const department = searchParams.get("department");
    const purpose = searchParams.get("purpose");
    const total = searchParams.get("total");
    const itemsParam = searchParams.get("items");
    setForm(prev => ({
      ...prev,
      ...(department ? { department } : {}),
      ...(purpose ? { purpose } : {}),
    }));
    if (itemsParam) {
      try {
        const parsed = JSON.parse(itemsParam);
        if (Array.isArray(parsed) && parsed.length) {
          const mapped = parsed.map((item: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            description: item.item_description || "",
            qty: Number(item.quantity) || 1,
            unit: item.unit || "pcs",
            unit_cost: Number(item.unit_cost) || 0,
            total_cost: Number(item.total_cost) || (Number(item.quantity) || 1) * (Number(item.unit_cost) || 0),
          }));
          setItems(mapped);
        }
      } catch {}
    } else if (total) {
      setItems(prev => prev.length ? prev : [emptyItem()]);
    }
  }, [searchParams]);

  const total = items.reduce((sum, item) => sum + item.qty * item.unit_cost, 0);

  const updateItem = (index: number, patch: Partial<Item>) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...patch };
      next.total_cost = next.qty * next.unit_cost;
      return next;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const handleAiDraft = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/slot-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: aiInput }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Unable to generate the draft.");
      const ext = data.extracted || {};
      setForm(prev => ({
        ...prev,
        purpose: ext.purpose || prev.purpose,
        department: ext.department || prev.department,
      }));
      if (Array.isArray(ext.items) && ext.items.length) {
        setItems(ext.items.map((item: any, index: number) => {
          const qty = Number(item.quantity) || 1;
          const unitCost = Number(item.unit_cost) || 0;
          return {
            id: `${Date.now()}-${index}`,
            description: item.item_description || "",
            qty,
            unit: item.unit || "pcs",
            unit_cost: unitCost,
            total_cost: Number(item.total_cost) || qty * unitCost,
          };
        }));
      }
      setShowAi(false);
      setAiInput("");
    } catch (err: any) {
      setError(err?.message || "Failed to process the AI draft.");
    } finally {
      setAiLoading(false);
    }
  };

  const validateBeforeReview = () => {
    const validationErrors = validatePurchaseRequest({
      purpose: form.purpose,
      department: form.department,
      section: form.section,
      requestedBy: userName,
      designation: form.requested_by_designation,
      items: items.filter(item => item.description.trim()).map(item => ({
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unit_cost: item.unit_cost,
      })),
    });
    const message = firstValidationError(validationErrors);
    if (message) {
      setError(message);
      setShowReview(false);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return setError("You must be logged in.");

    if (!reviewConfirmedRef.current) {
      if (!validateBeforeReview()) return;
      setShowReview(true);
      return;
    }

    reviewConfirmedRef.current = false;
    if (!form.purpose.trim()) return setError("Please enter a purpose/description.");
    if (!form.department.trim()) return setError("Please enter your department.");
    if (!items.some(item => item.description.trim())) return setError("Please add at least one item with a description.");
    if (!userName.trim() || userName.includes("@")) return setError("Please enter your actual full name, not an email address.");

    setSubmitting(true);
    setError(null);
    try {
      await supabase.auth.updateUser({ data: { full_name: userName.trim() } }).catch(() => {});

      const validItems = items.filter(item => item.description.trim()).map(item => ({
        description: item.description.trim(),
        qty: item.qty,
        unit: item.unit.trim() || "pcs",
        unit_cost: item.unit_cost,
        total_cost: item.qty * item.unit_cost,
      }));

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/pr/create", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          department: form.department.trim(),
          section: form.section.trim() || null,
          purpose: form.purpose.trim(),
          total,
          printed_name: userName.trim(),
          designation: form.requested_by_designation.trim() || null,
          items: validItems,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error || !resData.pr) throw new Error(resData?.error || "Failed to create the purchase request.");
      router.push(`/dashboard/pr/${resData.pr.pr_no}?created=1`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  const confirmReview = () => {
    if (!validateBeforeReview()) return;
    setShowReview(false);
    reviewConfirmedRef.current = true;
    setTimeout(() => formRef.current?.requestSubmit(), 0);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><Loader2 className="h-10 w-10 animate-spin text-[#7A1315]" /></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3 text-[#4D0C0D]"><ArrowLeft className="h-5 w-5 text-stone-600" /><span className="bg-[#7A1315] p-2 rounded-xl text-amber-200 border border-amber-400/30"><FileText className="h-5 w-5" /></span><span className="font-bold text-xl">New Purchase Request</span></Link>
          <button onClick={() => setShowAi(true)} className="bg-gradient-to-r from-[#B88E13] to-[#D4AF37] text-[#4D0C0D] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-amber-500/40"><Sparkles className="h-4 w-4" />Draft with AI</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span></div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">PR Number</label><input value="Auto-generated" disabled className="w-full px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 font-medium" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={new Date().toISOString().split("T")[0]} disabled className="w-full px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 font-medium" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label><input type="text" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Enter your department (e.g., College of Education)" required className="w-full px-4 py-2.5 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /><p className="text-xs text-stone-500 mt-1">Enter the department/unit you belong to. There are no preset choices.</p></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Section <span className="text-stone-400 font-normal">(Optional)</span></label><input type="text" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Enter section if applicable" className="w-full px-4 py-2.5 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /><p className="text-xs text-stone-500 mt-1">You may leave this blank.</p></div>
            </div>

            <div><label className="block text-sm font-medium text-gray-700 mb-1">SAI No.</label><input value="Auto-generated" disabled className="w-full px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 font-medium" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ALOBs No.</label><input value="Auto-generated" disabled className="w-full px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 font-medium" /></div>

            <div><label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Description <span className="text-red-500">*</span></label><textarea value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Describe the purpose of this purchase request..." rows={3} required className="w-full px-4 py-2.5 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /></div>

            <div>
              <div className="flex justify-between items-center mb-3"><label className="text-sm font-medium text-gray-700">Items</label><button type="button" onClick={addItem} className="text-[#7A1315] font-semibold text-sm flex items-center gap-1"><Plus className="h-4 w-4" />Add Item</button></div>
              <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="bg-gray-50"><th className="p-2 text-left text-xs text-gray-500">Description</th><th className="p-2 text-center text-xs text-gray-500">Qty</th><th className="p-2 text-center text-xs text-gray-500">Unit</th><th className="p-2 text-right text-xs text-gray-500">Unit Cost</th><th className="p-2 text-right text-xs text-gray-500">Total</th><th /></tr></thead><tbody className="divide-y divide-gray-100">{items.map((item, index) => <tr key={item.id}><td className="p-2"><input value={item.description} onChange={e => updateItem(index, { description: e.target.value })} placeholder="Item description..." className="w-full px-3 py-1.5 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none text-sm" /></td><td className="p-2"><input type="number" min="1" value={item.qty} onChange={e => updateItem(index, { qty: Math.max(1, Number(e.target.value) || 1) })} className="w-16 px-2 py-1.5 border border-stone-300 rounded-lg bg-white text-gray-900 text-center text-sm focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /></td><td className="p-2"><input value={item.unit} onChange={e => updateItem(index, { unit: e.target.value })} placeholder="pcs" className="w-16 px-2 py-1.5 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 text-center text-sm focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /></td><td className="p-2"><input type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => updateItem(index, { unit_cost: Math.max(0, Number(e.target.value) || 0) })} className="w-24 px-2 py-1.5 border border-stone-300 rounded-lg bg-white text-gray-900 text-right text-sm focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /></td><td className="p-2 text-right text-sm font-semibold text-gray-900">₱{(item.qty * item.unit_cost).toFixed(2)}</td><td className="p-2 text-center"><button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="text-gray-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody><tfoot><tr className="bg-gray-50"><td colSpan={4} className="p-3 text-right font-semibold">TOTAL:</td><td className="p-3 text-right font-bold text-[#7A1315]">₱{total.toFixed(2)}</td><td /></tr></tfoot></table></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div><label className="block text-sm font-semibold text-stone-800 mb-1">Requested By (Actual Full Name) <span className="text-red-500">*</span></label><input required value={userName} onChange={e => setUserName(e.target.value)} placeholder="Enter your actual full name" className="w-full px-4 py-2.5 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /><p className="text-xs text-stone-500 mt-1">Use your real name, not your email address.</p><input value={form.requested_by_designation} onChange={e => setForm({ ...form, requested_by_designation: e.target.value })} placeholder="Designation (optional)" className="w-full mt-2 px-4 py-2 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /></div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-sm font-semibold text-stone-800">Approved By</p><div className="mt-2 px-4 py-3 rounded-lg border border-stone-300 bg-white font-semibold text-stone-800">Atty. Shidik T. Abantas, MDM, LLM<br /><span className="font-normal text-sm">Chancellor</span></div><p className="text-xs text-stone-500 mt-1">Fixed approving authority. This cannot be changed by the end user.</p></div>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] text-white py-3.5 rounded-xl font-bold shadow-md border border-amber-400/30 flex items-center justify-center gap-2 disabled:opacity-50">{submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting Purchase Request...</> : <><Save className="h-5 w-5 text-amber-300" />Submit Purchase Request</>}</button>
          </form>
        </div>
      </main>

      {showAi && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"><div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"><div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2"><div className="bg-[#7A1315] p-2 rounded-xl text-amber-200"><Sparkles className="h-5 w-5" /></div><h3 className="text-lg font-bold text-[#4D0C0D]">Draft with AI Procurement Assistant</h3></div><button onClick={() => setShowAi(false)} className="text-gray-400"><X className="h-5 w-5" /></button></div><p className="text-sm text-gray-600 mb-4">Describe what you need and AI will structure the purchase request for you.</p><textarea value={aiInput} onChange={e => setAiInput(e.target.value)} rows={4} placeholder="Example: I need 10 laptops for the College of Engineering..." className="w-full px-4 py-3 border border-stone-300 rounded-lg bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none" /><button onClick={handleAiDraft} disabled={aiLoading || !aiInput.trim()} className="mt-4 w-full bg-[#7A1315] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{aiLoading ? <><Loader2 className="h-5 w-5 animate-spin" />Drafting...</> : <><Send className="h-5 w-5 text-amber-300" />Generate Draft</>}</button></div></div>}

      {showReview && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] px-4"><div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"><div className="flex justify-between items-center mb-5"><div><div className="flex items-center gap-2"><div className="bg-[#7A1315] p-2 rounded-xl text-amber-200"><CheckCircle2 className="h-5 w-5" /></div><h3 className="text-lg font-bold text-[#4D0C0D]">Double-check your Purchase Request</h3></div><p className="text-sm text-stone-500 mt-2">Please review the details below before the PR is created. You can close this and correct any errors.</p></div><button onClick={() => setShowReview(false)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button></div><div className="space-y-4 text-sm"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ReviewField label="Department" value={form.department} /><ReviewField label="Section" value={form.section || "—"} /><ReviewField label="Purpose" value={form.purpose} /><ReviewField label="Requested By" value={userName} /></div><div className="border rounded-xl overflow-hidden"><div className="bg-stone-50 px-4 py-2 font-semibold text-stone-700">Items</div><div className="divide-y">{items.filter(i => i.description.trim()).map(item => <div key={item.id} className="px-4 py-3 flex justify-between gap-4"><div><div className="font-medium text-stone-800">{item.description}</div><div className="text-xs text-stone-500">{item.qty} {item.unit} × ₱{item.unit_cost.toFixed(2)}</div></div><div className="font-semibold text-[#7A1315]">₱{(item.qty * item.unit_cost).toFixed(2)}</div></div>)}</div><div className="px-4 py-3 bg-stone-50 flex justify-between font-bold"><span>Total</span><span className="text-[#7A1315]">₱{total.toFixed(2)}</span></div></div><div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">After confirmation, the system will create the Purchase Request and assign its PR number. Verify names, purpose, quantities, units, and costs carefully.</div></div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowReview(false)} className="flex-1 border border-stone-300 text-stone-700 py-3 rounded-xl font-semibold hover:bg-stone-50">Go Back & Edit</button><button type="button" onClick={confirmReview} disabled={submitting} className="flex-1 bg-[#7A1315] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Confirm & Create PR</button></div></div></div>}
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><div className="text-[10px] uppercase tracking-wider font-bold text-stone-500">{label}</div><div className="mt-1 text-stone-800 whitespace-pre-wrap break-words">{value}</div></div>;
}
