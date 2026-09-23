"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, FileText, Loader2, Plus, Save, Trash2, X, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";
import { firstValidationError, validatePurchaseRequest } from "@/lib/pr-validation";

interface Item {
  id: string;
  description: string;
  qty: number | "";
  unit: string;
  unit_cost: number | "";
  total_cost: number;
}

const emptyItem = (): Item => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  description: "",
  qty: 1,
  unit: "pcs",
  unit_cost: "",
  total_cost: 0,
});

const STANDARD_UNITS = [
  { value: "pcs", label: "pcs (Pieces)" },
  { value: "unit", label: "unit (Units)" },
  { value: "set", label: "set (Sets)" },
  { value: "box", label: "box (Boxes)" },
  { value: "ream", label: "ream (Reams)" },
  { value: "pack", label: "pack (Packs)" },
  { value: "roll", label: "roll (Rolls)" },
  { value: "lot", label: "lot (Lot / Package)" },
  { value: "pair", label: "pair (Pairs)" },
  { value: "bottle", label: "bottle (Bottles)" },
  { value: "bundle", label: "bundle (Bundles)" },
  { value: "kit", label: "kit (Kits)" },
  { value: "kg", label: "kg (Kilograms)" },
  { value: "g", label: "g (Grams)" },
  { value: "liter", label: "liter (Liters)" },
  { value: "meter", label: "meter (Meters)" },
  { value: "job", label: "job (Job Order)" },
  { value: "service", label: "service (Services)" },
  { value: "license", label: "license (Licenses)" },
  { value: "month", label: "month (Months)" },
];

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
  const [showReview, setShowReview] = useState(false);
  const [createdPRNo, setCreatedPRNo] = useState<string | null>(null);
  const [physicalSubmissionAcknowledged, setPhysicalSubmissionAcknowledged] = useState(false);
  const [form, setForm] = useState({ purpose: "", department: "", section: "", requested_by_designation: "" });
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  useEffect(() => {
    (async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }
      if (!user) { router.push("/"); return; }
      setUserId(user.id);
      const name = user.user_metadata?.full_name || "";
      setUserName(name && !name.includes("@") ? name : "");
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!searchParams) return;
    const department = searchParams.get("department"); const purpose = searchParams.get("purpose"); const totalParam = searchParams.get("total"); const itemsParam = searchParams.get("items");
    setForm(prev => ({ ...prev, ...(department ? { department } : {}), ...(purpose ? { purpose } : {}) }));
    if (itemsParam) {
      try {
        const parsed = JSON.parse(itemsParam);
        if (Array.isArray(parsed) && parsed.length) {
          setItems(parsed.map((item: any, index: number) => {
            const qty = Number(item.quantity) || 1;
            const unitCost = Number(item.unit_cost) || 0;
            return {
              id: `${Date.now()}-${index}`,
              description: item.item_description || "",
              qty,
              unit: item.unit || "pcs",
              unit_cost: unitCost > 0 ? unitCost : "",
              total_cost: qty * unitCost
            };
          }));
        }
      } catch {}
    } else if (totalParam) {
      setItems(prev => prev.length ? prev : [emptyItem()]);
    }
  }, [searchParams]);

  const total = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unit_cost) || 0),
    0
  );

  const updateItem = (index: number, patch: Partial<Item>) =>
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...patch };
      const q = typeof next.qty === "number" ? next.qty : (next.qty === "" ? 0 : Number(next.qty) || 0);
      const c = typeof next.unit_cost === "number" ? next.unit_cost : (next.unit_cost === "" ? 0 : Number(next.unit_cost) || 0);
      next.total_cost = q * c;
      return next;
    }));

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  const validateBeforeReview = () => {
    if (!physicalSubmissionAcknowledged) {
      setError("Please acknowledge the physical submission requirement. After creating the PR, you must print it and physically submit the signed PR and required supporting documents to the Procurement Office.");
      setShowReview(false);
      return false;
    }
    const validationErrors = validatePurchaseRequest({
      purpose: form.purpose,
      department: form.department,
      section: form.section,
      requestedBy: userName,
      designation: form.requested_by_designation,
      items: items.filter(item => item.description.trim()).map(item => ({
        description: item.description,
        qty: Number(item.qty) || 0,
        unit: item.unit,
        unit_cost: Number(item.unit_cost) || 0
      }))
    });
    const message = firstValidationError(validationErrors);
    if (message) { setError(message); setShowReview(false); return false; }
    setError(null); return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return setError("You must be logged in.");
    if (!reviewConfirmedRef.current) { if (!validateBeforeReview()) return; setShowReview(true); return; }
    reviewConfirmedRef.current = false;
    setSubmitting(true); setError(null);
    try {
      await supabase.auth.updateUser({ data: { full_name: userName.trim() } }).catch(() => {});
      const validItems = items.filter(item => item.description.trim()).map(item => {
        const q = Number(item.qty) || 1;
        const c = Number(item.unit_cost) || 0;
        return {
          description: item.description.trim(),
          qty: q,
          unit: item.unit.trim() || "pcs",
          unit_cost: c,
          total_cost: q * c
        };
      });
      const { data: sessionData } = await supabase.auth.getSession(); const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/pr/create", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ department: form.department.trim(), section: form.section.trim() || null, purpose: form.purpose.trim(), total, printed_name: userName.trim(), designation: form.requested_by_designation.trim() || null, items: validItems }) });
      const resData = await res.json();
      if (!res.ok || resData.error || !resData.pr) throw new Error(resData?.error || "Failed to create the purchase request.");
      setCreatedPRNo(resData.pr.pr_no);
    } catch (err: any) { setError(err?.message || "An unexpected error occurred."); } finally { setSubmitting(false); }
  };

  const confirmReview = () => { if (!validateBeforeReview()) return; setShowReview(false); reviewConfirmedRef.current = true; setTimeout(() => formRef.current?.requestSubmit(), 0); };
  const viewCreatedPR = () => { if (createdPRNo) router.push(`/dashboard/pr/${encodeURIComponent(createdPRNo)}`); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><Loader2 className="h-10 w-10 animate-spin text-[#7B0046]" /></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16">
      {/* Top Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-[#4D002C] group"
          >
            <div className="p-1.5 rounded-lg border border-stone-200 text-stone-600 group-hover:text-[#7B0046] group-hover:border-[#7B0046]/30 group-hover:bg-[#FAF7F2] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-3">
              <MsuLogo size={38} className="shrink-0" />
              <div>
                <span className="font-extrabold text-lg text-[#4D002C] leading-tight block">New Purchase Request</span>
                <span className="text-[11px] text-stone-500 font-medium leading-none">Mindanao State University - General Santos</span>
              </div>
            </div>
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          {/* Header Banner */}
          <div className="h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046]" />
          
          <div className="p-6 md:p-8">
            {/* Official University Header & Dedicated Logo Space */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 mb-8 border-b border-stone-200 text-center sm:text-left">
              <div className="shrink-0">
                <MsuLogo size={68} className="rounded-full shadow-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Republic of the Philippines
                </p>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-[#4D002C] tracking-tight">
                  MINDANAO STATE UNIVERSITY - GENERAL SANTOS
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-[#8C6B13]">
                  Procurement Management Office &middot; Fatima, General Santos City
                </p>
                <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200/80 px-3 py-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[#7B0046]">
                    PURCHASE REQUEST FORM (PR)
                  </span>
                </div>
              </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
              {/* Physical Submission Notice */}
              <div className="rounded-xl border-2 border-amber-300/80 bg-[#FFFDF7] p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 h-10 w-10 rounded-xl bg-[#7B0046] text-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-black text-[#4D002C] tracking-tight uppercase">Important: Physical submission is required</h2>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-stone-700">
                      Submitting this Purchase Request through ProcuremateSU only records and prepares the PR digitally. It does <strong>not</strong> replace the required physical submission to the Procurement Office.
                    </p>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-stone-700">
                      After creating your PR, you must <strong>print the PR form</strong> and physically submit the signed copy together with the required supporting documents to the Procurement Office for actual processing.
                    </p>
                    <label className="mt-3.5 flex items-start gap-3 cursor-pointer select-none bg-amber-100/50 hover:bg-amber-100/80 transition-colors p-3 rounded-lg border border-amber-200">
                      <input
                        type="checkbox"
                        checked={physicalSubmissionAcknowledged}
                        onChange={(e) => {
                          setPhysicalSubmissionAcknowledged(e.target.checked);
                          if (e.target.checked && error?.includes("physical submission requirement")) setError(null);
                        }}
                        className="mt-0.5 h-4 w-4 accent-[#7B0046] cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-bold leading-5 text-[#4D002C]">
                        I understand that online submission does not replace physical submission, and I will print and physically submit my PR and required supporting documents to the Procurement Office.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 1: Form & Department Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#9A7410] bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">Section 1</span>
                  <h3 className="text-base font-extrabold text-[#4D002C]">Document &amp; Department Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">PR Number</label>
                    <input
                      value="Auto-generated"
                      disabled
                      className="w-full h-11 px-3.5 font-mono text-sm font-semibold text-stone-500 bg-stone-100 rounded-xl border border-stone-200"
                    />
                    <p className="text-[11px] text-stone-500">Assigned upon submission</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">Date</label>
                    <input
                      type="date"
                      value={new Date().toISOString().split("T")[0]}
                      disabled
                      className="w-full h-11 px-3.5 text-sm font-semibold text-stone-600 bg-stone-100 rounded-xl border border-stone-200"
                    />
                    <p className="text-[11px] text-stone-500">Current date</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">SAI No.</label>
                    <input
                      value="Auto-generated"
                      disabled
                      className="w-full h-11 px-3.5 font-mono text-sm font-semibold text-stone-500 bg-stone-100 rounded-xl border border-stone-200"
                    />
                    <p className="text-[11px] text-stone-500">Accounting reference</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">ALOBs No.</label>
                    <input
                      value="Auto-generated"
                      disabled
                      className="w-full h-11 px-3.5 font-mono text-sm font-semibold text-stone-500 bg-stone-100 rounded-xl border border-stone-200"
                    />
                    <p className="text-[11px] text-stone-500">Budget reference</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label htmlFor="pr-dept" className="block text-sm font-bold text-stone-800">
                      Department / College / Office <span className="text-[#9E1A1D]">*</span>
                    </label>
                    <input
                      id="pr-dept"
                      type="text"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="e.g., College of Engineering, Cashier's Office"
                      required
                      className="w-full h-12 px-4 text-base sm:text-sm rounded-xl border border-stone-300 bg-white focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all shadow-xs"
                    />
                    <p className="text-[11px] text-stone-500">Enter the official name of your operating unit or department.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="pr-section" className="block text-sm font-bold text-stone-800">
                      Section <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="pr-section"
                      type="text"
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value })}
                      placeholder="e.g., IT Support Section, Science Laboratory"
                      className="w-full h-12 px-4 text-base sm:text-sm rounded-xl border border-stone-300 bg-white focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all shadow-xs"
                    />
                    <p className="text-[11px] text-stone-500">Leave blank if not applicable.</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label htmlFor="pr-purpose" className="block text-sm font-bold text-stone-800">
                    Purpose / Description <span className="text-[#9E1A1D]">*</span>
                  </label>
                  <textarea
                    id="pr-purpose"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    placeholder="State clearly the official purpose of this purchase request..."
                    rows={4}
                    required
                    className="w-full min-h-[115px] p-4 text-base sm:text-sm rounded-xl border border-stone-300 bg-white focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all shadow-xs resize-y leading-relaxed"
                  />
                  <p className="text-[11px] text-stone-500">Provide an accurate justification and intended use for the requested items.</p>
                </div>
              </div>

              {/* Section 2: Items Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#9A7410] bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">Section 2</span>
                    <h3 className="text-base font-extrabold text-[#4D002C]">Requested Items &amp; Cost Breakdown</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="ui-button ui-button-secondary text-xs px-3 py-1.5 h-8 font-bold flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#7B0046]" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#FAF7F2] border-b border-stone-200">
                          <th className="py-3 px-3 w-12 text-center font-bold text-stone-500">#</th>
                          <th className="py-3 px-3 min-w-[280px] font-bold text-stone-700">
                            <div className="flex items-center gap-1.5">
                              <span>Item Description &amp; Complete Specifications</span>
                              <span className="text-[#9E1A1D]">*</span>
                            </div>
                            <span className="block text-[10px] font-normal text-stone-500 font-sans mt-0.5">
                              Include brand, model, specs (e.g. processor/RAM or dimensions/size)
                            </span>
                          </th>
                          <th className="py-3 px-3 w-28 text-center font-bold text-stone-700">
                            <div>Qty <span className="text-[#9E1A1D]">*</span></div>
                            <span className="block text-[10px] font-normal text-stone-500 font-sans mt-0.5">Quantity</span>
                          </th>
                          <th className="py-3 px-3 w-36 text-center font-bold text-stone-700">
                            <div>Unit <span className="text-[#9E1A1D]">*</span></div>
                            <span className="block text-[10px] font-normal text-stone-500 font-sans mt-0.5">Dropdown</span>
                          </th>
                          <th className="py-3 px-3 w-36 text-right font-bold text-stone-700">
                            <div>Unit Cost (₱) <span className="text-[#9E1A1D]">*</span></div>
                            <span className="block text-[10px] font-normal text-stone-500 font-sans mt-0.5">Estimated</span>
                          </th>
                          <th className="py-3 px-3 w-36 text-right font-bold text-stone-700">
                            <div>Total (₱)</div>
                            <span className="block text-[10px] font-normal text-stone-500 font-sans mt-0.5">Subtotal</span>
                          </th>
                          <th className="py-3 px-2 w-12 text-center font-bold text-stone-500" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white">
                        {items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-3 px-3 text-center font-semibold text-stone-400">
                              {index + 1}
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(index, { description: e.target.value })}
                                placeholder="e.g., Desktop Computer: Core i7 13th Gen, 16GB RAM, 512GB SSD, 24&quot; IPS Monitor, Win 11 Pro"
                                className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-lg border border-stone-300 focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all"
                              />
                              {item.description.trim().length > 0 && item.description.trim().length < 15 && (
                                <p className="text-[10px] text-amber-700 font-medium mt-1">
                                  Please provide complete technical specs (brand, model, size/specs, capacity, etc.)
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                placeholder="1"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    updateItem(index, { qty: "" });
                                  } else {
                                    const parsed = parseInt(val, 10);
                                    updateItem(index, { qty: isNaN(parsed) ? "" : parsed });
                                  }
                                }}
                                onBlur={() => {
                                  if (item.qty === "" || Number(item.qty) < 1) {
                                    updateItem(index, { qty: 1 });
                                  }
                                }}
                                className="w-full h-11 px-2 text-center text-sm font-semibold rounded-lg border border-stone-300 focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={item.unit}
                                onChange={(e) => updateItem(index, { unit: e.target.value })}
                                className="w-full h-11 px-2 text-center text-xs sm:text-sm font-medium rounded-lg border border-stone-300 bg-white focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all cursor-pointer shadow-2xs"
                              >
                                {STANDARD_UNITS.map((u) => (
                                  <option key={u.value} value={u.value}>
                                    {u.label}
                                  </option>
                                ))}
                                {item.unit && !STANDARD_UNITS.some((u) => u.value.toLowerCase() === item.unit.toLowerCase()) && (
                                  <option value={item.unit}>{item.unit}</option>
                                )}
                              </select>
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unit_cost}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    updateItem(index, { unit_cost: "" });
                                  } else {
                                    const parsed = parseFloat(val);
                                    updateItem(index, { unit_cost: isNaN(parsed) ? "" : parsed });
                                  }
                                }}
                                onBlur={() => {
                                  if (item.unit_cost === "") {
                                    updateItem(index, { unit_cost: 0 });
                                  }
                                }}
                                className="w-full h-11 px-3 text-right text-sm font-mono rounded-lg border border-stone-300 focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all"
                              />
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 text-sm sm:text-base">
                              ₱{((Number(item.qty) || 0) * (Number(item.unit_cost) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                disabled={items.length === 1}
                                title="Remove item"
                                className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-25 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#FAF7F2] border-t-2 border-stone-200">
                          <td colSpan={4} className="py-3 px-4 text-right font-extrabold uppercase tracking-wider text-xs text-stone-600">
                            Estimated Total Amount:
                          </td>
                          <td colSpan={2} className="py-3 px-4 text-right font-mono font-black text-base text-[#7B0046]">
                            ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 3: Signatories */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#9A7410] bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">Section 3</span>
                  <h3 className="text-base font-extrabold text-[#4D002C]">Signatories &amp; Responsibility</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3 rounded-xl border border-stone-200 bg-[#FFFEFC] p-5">
                    <label htmlFor="pr-requested-by" className="block text-sm font-bold text-stone-800">
                      Requested By (Requisitioner Name) <span className="text-[#9E1A1D]">*</span>
                    </label>
                    <input
                      id="pr-requested-by"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your actual full name"
                      className="w-full h-12 px-4 text-base sm:text-sm rounded-xl border border-stone-300 bg-white focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all shadow-xs"
                    />
                    <p className="text-[11px] text-stone-500">Provide your actual legal full name, not an email address.</p>
                    
                    <div className="pt-2 space-y-1.5">
                      <label htmlFor="pr-designation" className="block text-sm font-semibold text-stone-700">
                        Designation / Position <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        id="pr-designation"
                        value={form.requested_by_designation}
                        onChange={(e) => setForm({ ...form, requested_by_designation: e.target.value })}
                        placeholder="e.g., Faculty, Administrative Aide IV, Department Chair"
                        className="w-full h-12 px-4 text-base sm:text-sm rounded-xl border border-stone-300 bg-white focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-stone-800">Approving Authority</p>
                      <div className="mt-2.5 p-3 rounded-lg border border-stone-300 bg-white shadow-xs">
                        <div className="font-bold text-stone-900 text-sm">Atty. Shidik T. Abantas, MDM, LLM</div>
                        <div className="text-xs text-stone-600 mt-0.5">Chancellor</div>
                        <div className="text-[11px] text-[#7B0046] font-semibold mt-1">Mindanao State University - General Santos</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-3">
                      Institutional approving authority as defined by University policy. This is automatically set.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto ui-button ui-button-secondary text-stone-700 order-2 sm:order-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Cancel</span>
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto ui-button ui-button-primary px-8 py-3 text-sm order-1 sm:order-2 shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                      <span>Validating &amp; Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 text-amber-300" />
                      <span>Submit Purchase Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-stone-200">
            <div className="h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046] sticky top-0" />
            <div className="p-6 sm:p-7">
              <div className="flex justify-between items-start mb-5 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="bg-[#7B0046] p-2.5 rounded-xl text-amber-200 shadow-sm shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#4D002C]">Double-check your Purchase Request</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Please verify the details below before official creation.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ReviewField label="Department" value={form.department} />
                  <ReviewField label="Section" value={form.section || "—"} />
                  <ReviewField label="Purpose" value={form.purpose} />
                  <ReviewField label="Requested By" value={userName} />
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-[#FAF7F2] px-4 py-2.5 font-extrabold text-xs text-stone-700 uppercase tracking-wider border-b border-stone-200 flex justify-between">
                    <span>Items Breakdown</span>
                    <span>Subtotal</span>
                  </div>
                  <div className="divide-y divide-stone-100 max-h-52 overflow-y-auto">
                    {items.filter((i) => i.description.trim()).map((item) => {
                      const q = Number(item.qty) || 0;
                      const c = Number(item.unit_cost) || 0;
                      return (
                        <div key={item.id} className="px-4 py-3 flex justify-between gap-4 items-center bg-white">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-stone-800 text-xs truncate">{item.description}</div>
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              {q} {item.unit} × ₱{c.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div className="font-mono font-bold text-xs text-[#7B0046] shrink-0">
                            ₱{(q * c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 bg-[#FAF7F2] border-t border-stone-200 flex justify-between items-center font-extrabold">
                    <span className="text-xs uppercase tracking-wider text-stone-700">Total Amount:</span>
                    <span className="text-base font-mono font-black text-[#7B0046]">
                      ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                  <Printer className="h-4 w-4 shrink-0 text-[#7B0046] mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Physical submission reminder:</strong> Creating this PR online does not complete the procurement submission. You must print the PR and physically submit the signed PR and required supporting documents to the Procurement Office.
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowReview(false)}
                  className="ui-button ui-button-secondary flex-1 order-2 sm:order-1"
                >
                  Go Back &amp; Edit
                </button>
                <button
                  type="button"
                  onClick={confirmReview}
                  disabled={submitting || !physicalSubmissionAcknowledged}
                  className="ui-button ui-button-primary flex-1 order-1 sm:order-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  <span>Confirm &amp; Create PR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Created Modal */}
      {createdPRNo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 text-center">
            <div className="h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046]" />
            <div className="p-7">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-black text-[#4D002C] mt-4">Purchase Request Created</h3>
              <p className="text-xs text-stone-600 mt-1.5">Your Purchase Request has been recorded in ProcuremateSU.</p>
              
              <div className="mt-5 rounded-xl border border-stone-200 bg-[#FAF7F2] p-4">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-stone-500">Official PR Number</div>
                <div className="text-2xl font-black text-[#7B0046] mt-1 font-mono tracking-tight">{createdPRNo}</div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-left flex items-start gap-2.5">
                <Printer className="h-4 w-4 shrink-0 text-[#7B0046] mt-0.5" />
                <p className="text-xs leading-relaxed text-amber-950">
                  <span className="font-extrabold text-[#4D002C]">Next required step:</span> Open the PR, print the official form, sign it, and physically submit it to the Procurement Office.
                </p>
              </div>

              <div className="space-y-2 mt-6">
                <button
                  type="button"
                  onClick={viewCreatedPR}
                  className="w-full ui-button ui-button-primary py-3"
                >
                  <span>View Purchase Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedPRNo(null)}
                  className="w-full ui-button ui-button-secondary py-2.5"
                >
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Error Pop-up / Toast Notification */}
      {error && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-[90] max-w-md w-[calc(100vw-2rem)] sm:w-[440px] bg-white rounded-2xl border-2 border-red-500 shadow-[0_16px_48px_rgba(180,20,20,0.32)] overflow-hidden transition-all animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-[#7B0046]" />
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0 mt-0.5 shadow-2xs">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-red-900 tracking-tight">Attention: Form Incomplete</h4>
                  <p className="mt-1.5 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                    {error}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
                title="Dismiss notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-bold text-white bg-[#7B0046] hover:bg-[#610037] px-4 py-1.5 rounded-lg transition-colors shadow-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-stone-500">{label}</div>
      <div className="mt-1 text-xs font-semibold text-stone-800 whitespace-pre-wrap break-words">{value}</div>
    </div>
  );
}
