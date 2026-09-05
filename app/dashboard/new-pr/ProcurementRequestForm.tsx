"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, FileText, Loader2, Plus, Save, Send, Sparkles, Trash2, X } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
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
      // Total is calculated from item rows; keep the URL value only as a fallback for AI/chatbot drafts.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return setError("You must be logged in.");
    if (!form.purpose.trim()) return setError("Please enter a purpose/description.");
    if (!form.department.trim()) return setError("Please enter your department.");
    if (!items.some(item => item.description.trim())) return setError("Please add at least one item with a description.");
    if (!userName.trim() || userName.includes("@")) return setError("Please enter your actual full name, not an email address.");

    setSubmitting(true);
    setError(null);
    try {
      await supabase.auth.updateUser({ data: { full_name: userName.trim() } });
      const { data: prData, error: prError } = await supabase
        .from("purchase_requests")
        .insert({
          user_id: userId,
          department: form.department.trim(),
          section: form.section.trim() || null,
          purpose: form.purpose.trim(),
          total,
          printed_name: userName.trim(),
          designation: form.requested_by_designation.trim() || null,
          current_stage: "draft",
          pr_date: new Date().toISOString().split("T")[0],
          sai_no: null,
          alobs_no: null,
        })
        .select()
        .single();

      if (prError || !prData) throw new Error(prError?.message || "Failed to create the purchase request.");

      const rows = items.filter(item => item.description.trim()).map(item => ({
        pr_no: prData.pr_no,
        item_description: item.description.trim(),
        quantity: item.qty,
        unit: item.unit.trim() || "pcs",
        unit_cost: item.unit_cost,
        total_cost: item.qty * item.unit_cost,
      }));
      const { error: itemsError } = await supabase.from("pr_items").insert(rows);
      if (itemsError) throw new Error("PR was created, but the item details could not be saved.");

      router.push(`/dashboard/pr/${prData.pr_no}`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><Loader2 className="h-10 w-10 animate-spin text-[#7A1315]" /></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3 text-[#4D0C0D]">
            <ArrowLeft className="h-5 w-5 text-stone-600" />
            <span className="bg-[#7A1315] p-2 rounded-xl text-amber-200 border border-amber-400/30"><FileText className="h-5 w-5" /></span>
            <span className="font-bold text-xl">New Purchase Request</span>
          </Link>
          <button onClick={() => setShowAi(true)} className="bg-gradient-to-r from-[#B88E13] to-[#D4AF37] text-[#4D0C0D] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-amber-500/40"><Sparkles className="h-4 w-4" />Draft with AI</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">PR Number</label><input value="Auto-generated" disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={new Date().toISOString().split("T")[0]} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                <input type="text" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Enter your department (e.g., College of Education)" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none bg-white" />
                <p className="text-xs text-stone-500 mt-1">Enter the department/unit you belong to. There are no preset choices.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section <span className="text-stone-400 font-normal">(Optional)</span></label>
                <input type="text" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Enter section if applicable" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none bg-white" />
                <p className="text-xs text-stone-500 mt-1">You may leave this blank.</p>
              </div>
            </div>

            <div><label className="block text-sm font-medium text-gray-700 mb-1">SAI No.</label><input value="Auto-generated" disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ALOBs No.</label><input value="Auto-generated" disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" /></div>

            <div><label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Description <span className="text-red-500">*</span></label><textarea value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Describe the purpose of this purchase request..." rows={2} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none bg-white" /></div>

            <div>
              <div className="flex justify-between items-center mb-3"><label className="text-sm font-medium text-gray-700">Items</label><button type="button" onClick={addItem} className="text-[#7A1315] font-semibold text-sm flex items-center gap-1"><Plus className="h-4 w-4" />Add Item</button></div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse"><thead><tr className="bg-gray-50"><th className="p-2 text-left text-xs text-gray-500">Description</th><th className="p-2 text-center text-xs text-gray-500">Qty</th><th className="p-2 text-center text-xs text-gray-500">Unit</th><th className="p-2 text-right text-xs text-gray-500">Unit Cost</th><th className="p-2 text-right text-xs text-gray-500">Total</th><th /></tr></thead><tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => <tr key={item.id}>
                    <td className="p-2"><input value={item.description} onChange={e => updateItem(index, { description: e.target.value })} placeholder="Item description..." className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></td>
                    <td className="p-2"><input type="number" min="1" value={item.qty} onChange={e => updateItem(index, { qty: Math.max(1, Number(e.target.value) || 1) })} className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm" /></td>
                    <td className="p-2"><input value={item.unit} onChange={e => updateItem(index, { unit: e.target.value })} placeholder="pcs" className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm" /></td>
                    <td className="p-2"><input type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => updateItem(index, { unit_cost: Math.max(0, Number(e.target.value) || 0) })} className="w-24 px-2 py-1 border border-gray-200 rounded text-right text-sm" /></td>
                    <td className="p-2 text-right text-sm font-medium">₱{(item.qty * item.unit_cost).toFixed(2)}</td>
                    <td className="p-2 text-center"><button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="text-gray-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>)}
                </tbody><tfoot><tr className="bg-gray-50"><td colSpan={4} className="p-3 text-right font-semibold">TOTAL:</td><td className="p-3 text-right font-bold text-[#7A1315]">₱{total.toFixed(2)}</td><td /></tr></tfoot></table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-stone-800 mb-1">Requested By (Actual Full Name) <span className="text-red-500">*</span></label>
                <input required value={userName} onChange={e => setUserName(e.target.value)} placeholder="Enter your actual full name" className="w-full px-4 py-2.5 border border-stone-300 rounded-lg" />
                <p className="text-xs text-stone-500 mt-1">Use your real name, not your email address.</p>
                <input value={form.requested_by_designation} onChange={e => setForm({ ...form, requested_by_designation: e.target.value })} placeholder="Designation (optional)" className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm font-semibold text-stone-800">Approved By</p>
                <div className="mt-2 px-4 py-3 rounded-lg border border-stone-300 bg-white font-semibold text-stone-800">Atty. Shidik T. Abantas, MDM, LLM<br /><span className="font-normal text-sm">Chancellor</span></div>
                <p className="text-xs text-stone-500 mt-1">Fixed approving authority. This cannot be changed by the end user.</p>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] text-white py-3.5 rounded-xl font-bold shadow-md border border-amber-400/30 flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting Purchase Request...</> : <><Save className="h-5 w-5 text-amber-300" />Submit Purchase Request</>}
            </button>
          </form>
        </div>
      </main>

      {showAi && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"><div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2"><div className="bg-[#7A1315] p-2 rounded-xl text-amber-200"><Sparkles className="h-5 w-5" /></div><h3 className="text-lg font-bold text-[#4D0C0D]">Draft with AI Procurement Assistant</h3></div><button onClick={() => setShowAi(false)} className="text-gray-400"><X className="h-5 w-5" /></button></div>
        <p className="text-sm text-gray-600 mb-4">Describe what you need and AI will structure the purchase request for you.</p>
        <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} rows={4} placeholder="Example: I need 10 laptops for the College of Engineering..." className="w-full px-4 py-3 border border-gray-200 rounded-lg" />
        <button onClick={handleAiDraft} disabled={aiLoading || !aiInput.trim()} className="mt-4 w-full bg-[#7A1315] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{aiLoading ? <><Loader2 className="h-5 w-5 animate-spin" />Drafting...</> : <><Send className="h-5 w-5 text-amber-300" />Generate Draft</>}</button>
      </div></div>}
    </div>
  );
}
