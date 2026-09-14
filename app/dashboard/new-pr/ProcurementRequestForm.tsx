"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, FileText, Loader2, Plus, Save, Send, Sparkles, Trash2, X, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import { firstValidationError, validatePurchaseRequest } from "@/lib/pr-validation";

interface Item { id: string; description: string; qty: number; unit: string; unit_cost: number; total_cost: number; }
const emptyItem = (): Item => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, description: "", qty: 1, unit: "pcs", unit_cost: 0, total_cost: 0 });

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
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      const name = user.user_metadata?.full_name || "";
      setUserName(name && !name.includes("@") ? name : "");
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!searchParams) return;
    const department = searchParams.get("department"); const purpose = searchParams.get("purpose"); const total = searchParams.get("total"); const itemsParam = searchParams.get("items");
    setForm(prev => ({ ...prev, ...(department ? { department } : {}), ...(purpose ? { purpose } : {}) }));
    if (itemsParam) { try { const parsed = JSON.parse(itemsParam); if (Array.isArray(parsed) && parsed.length) setItems(parsed.map((item: any, index: number) => ({ id: `${Date.now()}-${index}`, description: item.item_description || "", qty: Number(item.quantity) || 1, unit: item.unit || "pcs", unit_cost: Number(item.unit_cost) || 0, total_cost: Number(item.total_cost) || (Number(item.quantity) || 1) * (Number(item.unit_cost) || 0) }))); } catch {} } else if (total) setItems(prev => prev.length ? prev : [emptyItem()]);
  }, [searchParams]);

  const total = items.reduce((sum, item) => sum + item.qty * item.unit_cost, 0);
  const updateItem = (index: number, patch: Partial<Item>) => setItems(prev => prev.map((item, i) => { if (i !== index) return item; const next = { ...item, ...patch }; next.total_cost = next.qty * next.unit_cost; return next; }));
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  const handleAiDraft = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true); setError(null);
    try {
      const response = await fetch("/api/slot-fill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: aiInput }) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Unable to generate the draft.");
      const ext = data.extracted || {};
      setForm(prev => ({ ...prev, purpose: ext.purpose || prev.purpose, department: ext.department || prev.department }));
      if (Array.isArray(ext.items) && ext.items.length) setItems(ext.items.map((item: any, index: number) => { const qty = Number(item.quantity) || 1; const unitCost = Number(item.unit_cost) || 0; return { id: `${Date.now()}-${index}`, description: item.item_description || "", qty, unit: item.unit || "pcs", unit_cost: unitCost, total_cost: Number(item.total_cost) || qty * unitCost }; }));
      setShowAi(false); setAiInput("");
    } catch (err: any) { setError(err?.message || "Failed to process the AI draft."); } finally { setAiLoading(false); }
  };

  const validateBeforeReview = () => {
    if (!physicalSubmissionAcknowledged) {
      setError("Please acknowledge the physical submission requirement. After creating the PR, you must print it and physically submit the signed PR and required supporting documents to the Procurement Office.");
      setShowReview(false);
      return false;
    }
    const validationErrors = validatePurchaseRequest({ purpose: form.purpose, department: form.department, section: form.section, requestedBy: userName, designation: form.requested_by_designation, items: items.filter(item => item.description.trim()).map(item => ({ description: item.description, qty: item.qty, unit: item.unit, unit_cost: item.unit_cost })) });
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
      const validItems = items.filter(item => item.description.trim()).map(item => ({ description: item.description.trim(), qty: item.qty, unit: item.unit.trim() || "pcs", unit_cost: item.unit_cost, total_cost: item.qty * item.unit_cost }));
      const { data: sessionData } = await supabase.auth.getSession(); const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/pr/create", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ department: form.department.trim(), section: form.section.trim() || null, purpose: form.purpose.trim(), total, printed_name: userName.trim(), designation: form.requested_by_designation.trim() || null, items: validItems }) });
      const resData = await res.json();
      if (!res.ok || resData.error || !resData.pr) throw new Error(resData?.error || "Failed to create the purchase request.");
      setCreatedPRNo(resData.pr.pr_no);
    } catch (err: any) { setError(err?.message || "An unexpected error occurred."); } finally { setSubmitting(false); }
  };

  const confirmReview = () => { if (!validateBeforeReview()) return; setShowReview(false); reviewConfirmedRef.current = true; setTimeout(() => formRef.current?.requestSubmit(), 0); };
  const viewCreatedPR = () => { if (createdPRNo) router.push(`/dashboard/pr/${encodeURIComponent(createdPRNo)}`); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><Loader2 className="h-10 w-10 animate-spin text-[#7A1315]" /></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16">
      {/* Top Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-[#4D0C0D] group"
          >
            <div className="p-1.5 rounded-lg border border-stone-200 text-stone-600 group-hover:text-[#7A1315] group-hover:border-[#7A1315]/30 group-hover:bg-[#FAF7F2] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="bg-[#7A1315] p-2 rounded-xl text-amber-200 border border-amber-400/30 shadow-sm">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <span className="font-extrabold text-lg text-[#4D0C0D] leading-tight block">New Purchase Request</span>
                <span className="text-[11px] text-stone-500 font-medium leading-none">Mindanao State University - General Santos</span>
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setShowAi(true)}
            className="ui-button ui-button-gold text-xs px-3.5 py-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#4D0C0D]" />
            <span>Draft with AI</span>
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          {/* Header Banner */}
          <div className="h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#B88E13] to-[#7A1315]" />
          
          <div className="p-6 md:p-8">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-600" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              {/* Physical Submission Notice */}
              <div className="rounded-xl border-2 border-amber-300/80 bg-[#FFFDF7] p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 h-10 w-10 rounded-xl bg-[#7A1315] text-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-black text-[#4D0C0D] tracking-tight uppercase">Important: Physical submission is required</h2>
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
                        className="mt-0.5 h-4 w-4 accent-[#7A1315] cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-bold leading-5 text-[#4D0C0D]">
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
                  <h3 className="text-base font-extrabold text-[#4D0C0D]">Document &amp; Department Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">PR Number</label>
                    <input
                      value="Auto-generated"
                      disabled
                      className="w-full font-mono text-xs font-semibold text-stone-500 bg-stone-100"
                    />
                    <p className="text-[11px] text-stone-500">Assigned upon submission</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">Date</label>
                    <input
                      type="date"
                      value={new Date().toISOString().split("T")[0]}
                      disabled
                      className="w-full text-xs font-semibold text-stone-600 bg-stone-100"
                    />
                    <p className="text-[11px] text-stone-500">Current date</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">SAI No.</label>
                    <input
                      value="Auto-generated"
                      disabled
                      className="w-full font-mono text-xs font-semibold text-stone-500 bg-stone-100"
                    />
                    <p className="text-[11px] text-stone-500">Accounting reference</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700">ALOBs No.</label>
                    <input
                      value="Auto-generated"
                      disabled
                      className="w-full font-mono text-xs font-semibold text-stone-500 bg-stone-100"
                    />
                    <p className="text-[11px] text-stone-500">Budget reference</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label htmlFor="pr-dept" className="block text-xs font-bold text-stone-700">
                      Department / College / Office <span className="text-[#9E1A1D]">*</span>
                    </label>
                    <input
                      id="pr-dept"
                      type="text"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="e.g., College of Engineering, Cashier's Office"
                      required
                      className="w-full text-sm"
                    />
                    <p className="text-[11px] text-stone-500">Enter the official name of your operating unit or department.</p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="pr-section" className="block text-xs font-bold text-stone-700">
                      Section <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="pr-section"
                      type="text"
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value })}
                      placeholder="e.g., IT Support Section, Science Laboratory"
                      className="w-full text-sm"
                    />
                    <p className="text-[11px] text-stone-500">Leave blank if not applicable.</p>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label htmlFor="pr-purpose" className="block text-xs font-bold text-stone-700">
                    Purpose / Description <span className="text-[#9E1A1D]">*</span>
                  </label>
                  <textarea
                    id="pr-purpose"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    placeholder="State clearly the official purpose of this purchase request..."
                    rows={3}
                    required
                    className="w-full text-sm resize-y"
                  />
                  <p className="text-[11px] text-stone-500">Provide an accurate justification and intended use for the requested items.</p>
                </div>
              </div>

              {/* Section 2: Items Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#9A7410] bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">Section 2</span>
                    <h3 className="text-base font-extrabold text-[#4D0C0D]">Requested Items &amp; Cost Breakdown</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="ui-button ui-button-secondary text-xs px-3 py-1.5 h-8 font-bold flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#7A1315]" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF7F2] border-b border-stone-200">
                          <th className="py-3 px-3 w-10 text-center font-bold text-stone-500">#</th>
                          <th className="py-3 px-3 font-bold text-stone-700">Item Description</th>
                          <th className="py-3 px-3 w-20 text-center font-bold text-stone-700">Qty</th>
                          <th className="py-3 px-3 w-24 text-center font-bold text-stone-700">Unit</th>
                          <th className="py-3 px-3 w-32 text-right font-bold text-stone-700">Unit Cost (₱)</th>
                          <th className="py-3 px-3 w-32 text-right font-bold text-stone-700">Total (₱)</th>
                          <th className="py-3 px-2 w-12 text-center font-bold text-stone-500" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white">
                        {items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-2.5 px-3 text-center font-semibold text-stone-400">
                              {index + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                value={item.description}
                                onChange={(e) => updateItem(index, { description: e.target.value })}
                                placeholder="e.g., Heavy duty stapler, A4 copy paper (70gsm)"
                                className="w-full text-xs py-2 px-3"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updateItem(index, { qty: Math.max(1, Number(e.target.value) || 1) })}
                                className="w-full text-center text-xs py-2 px-2 font-semibold"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                value={item.unit}
                                onChange={(e) => updateItem(index, { unit: e.target.value })}
                                placeholder="pcs"
                                className="w-full text-center text-xs py-2 px-2"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) => updateItem(index, { unit_cost: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-full text-right text-xs py-2 px-2 font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                              ₱{(item.qty * item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                disabled={items.length === 1}
                                title="Remove item"
                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-25 transition-colors"
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
                          <td colSpan={2} className="py-3 px-4 text-right font-mono font-black text-base text-[#7A1315]">
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
                  <h3 className="text-base font-extrabold text-[#4D0C0D]">Signatories &amp; Responsibility</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-[#FFFEFC] p-4">
                    <label htmlFor="pr-requested-by" className="block text-xs font-bold text-stone-800">
                      Requested By (Requisitioner Name) <span className="text-[#9E1A1D]">*</span>
                    </label>
                    <input
                      id="pr-requested-by"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your actual full name"
                      className="w-full text-sm"
                    />
                    <p className="text-[11px] text-stone-500">Provide your actual legal full name, not an email address.</p>
                    
                    <div className="pt-2 space-y-1">
                      <label htmlFor="pr-designation" className="block text-xs font-semibold text-stone-700">
                        Designation / Position <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        id="pr-designation"
                        value={form.requested_by_designation}
                        onChange={(e) => setForm({ ...form, requested_by_designation: e.target.value })}
                        placeholder="e.g., Faculty, Administrative Aide IV, Department Chair"
                        className="w-full text-sm"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-[#FAF7F2] p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-stone-800">Approving Authority</p>
                      <div className="mt-2.5 p-3 rounded-lg border border-stone-300 bg-white shadow-xs">
                        <div className="font-bold text-stone-900 text-sm">Atty. Shidik T. Abantas, MDM, LLM</div>
                        <div className="text-xs text-stone-600 mt-0.5">Chancellor</div>
                        <div className="text-[11px] text-[#7A1315] font-semibold mt-1">Mindanao State University - General Santos</div>
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

      {/* AI Draft Modal */}
      {showAi && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
            <div className="h-1 bg-gradient-to-r from-[#4D0C0D] via-[#B88E13] to-[#7A1315]" />
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#7A1315] p-2 rounded-xl text-amber-200 shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#4D0C0D]">Draft with AI Procurement Assistant</h3>
                    <p className="text-[11px] text-stone-500">Auto-structure your requirements into form fields</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAi(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <label htmlFor="ai-desc" className="block text-xs font-bold text-stone-700">
                  What supplies or equipment do you need?
                </label>
                <textarea
                  id="ai-desc"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  rows={4}
                  placeholder="Example: I need 10 laptops for the College of Engineering computer laboratory, each costing around 35,000 pesos..."
                  className="w-full text-sm"
                />
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Mention quantities, estimated prices, and the department or purpose if available.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAi(false)}
                  className="ui-button ui-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={aiLoading || !aiInput.trim()}
                  className="ui-button ui-button-primary flex-1"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                      <span>Structuring Draft...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 text-amber-300" />
                      <span>Generate Draft</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-stone-200">
            <div className="h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#B88E13] to-[#7A1315] sticky top-0" />
            <div className="p-6 sm:p-7">
              <div className="flex justify-between items-start mb-5 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="bg-[#7A1315] p-2.5 rounded-xl text-amber-200 shadow-sm shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#4D0C0D]">Double-check your Purchase Request</h3>
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
                    {items.filter((i) => i.description.trim()).map((item) => (
                      <div key={item.id} className="px-4 py-3 flex justify-between gap-4 items-center bg-white">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-stone-800 text-xs truncate">{item.description}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {item.qty} {item.unit} × ₱{item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-xs text-[#7A1315] shrink-0">
                          ₱{(item.qty * item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-[#FAF7F2] border-t border-stone-200 flex justify-between items-center font-extrabold">
                    <span className="text-xs uppercase tracking-wider text-stone-700">Total Amount:</span>
                    <span className="text-base font-mono font-black text-[#7A1315]">
                      ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                  <Printer className="h-4 w-4 shrink-0 text-[#7A1315] mt-0.5" />
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
            <div className="h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#B88E13] to-[#7A1315]" />
            <div className="p-7">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-black text-[#4D0C0D] mt-4">Purchase Request Created</h3>
              <p className="text-xs text-stone-600 mt-1.5">Your Purchase Request has been recorded in ProcuremateSU.</p>
              
              <div className="mt-5 rounded-xl border border-stone-200 bg-[#FAF7F2] p-4">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-stone-500">Official PR Number</div>
                <div className="text-2xl font-black text-[#7A1315] mt-1 font-mono tracking-tight">{createdPRNo}</div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-left flex items-start gap-2.5">
                <Printer className="h-4 w-4 shrink-0 text-[#7A1315] mt-0.5" />
                <p className="text-xs leading-relaxed text-amber-950">
                  <span className="font-extrabold text-[#4D0C0D]">Next required step:</span> Open the PR, print the official form, sign it, and physically submit it to the Procurement Office.
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
