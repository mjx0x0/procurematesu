"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  X,
  Send,
} from "lucide-react";

interface Item {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

export default function NewPRForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // AI Dialog state
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    purpose: "",
    department: "",
    section: "",
    sai_no: "",
    alobs_no: "",
    total_amount: 0,
    requested_by_designation: "",
    approved_by: "",
    approved_by_designation: "",
  });

  const [items, setItems] = useState<Item[]>([
    {
      id: Date.now().toString(),
      description: "",
      qty: 1,
      unit: "pcs",
      unit_cost: 0,
      total_cost: 0,
    },
  ]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name || user.email || "");
    };
    getUser();
  }, [router]);

  // Pre-fill from URL params (sent by chatbot)
  useEffect(() => {
    const department = searchParams.get("department");
    const purpose = searchParams.get("purpose");
    const itemsParam = searchParams.get("items");
    const totalParam = searchParams.get("total");

    if (department) setFormData(prev => ({ ...prev, department }));
    if (purpose) setFormData(prev => ({ ...prev, purpose }));
    if (totalParam) setFormData(prev => ({ ...prev, total_amount: parseFloat(totalParam) || 0 }));

    if (itemsParam) {
      try {
        const parsedItems = JSON.parse(itemsParam);
        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          const newItems = parsedItems.map((item, idx) => ({
            id: Date.now().toString() + idx,
            description: item.item_description || "",
            qty: item.quantity || 1,
            unit: item.unit || "pcs",
            unit_cost: item.unit_cost || 0,
            total_cost: (item.quantity || 1) * (item.unit_cost || 0),
          }));
          setItems(newItems);
          calculateTotal();
        }
      } catch (e) {}
    }
  }, [searchParams]);

  // Calculate total
  const calculateTotal = () => {
    const total = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    setFormData(prev => ({ ...prev, total_amount: total }));
  };

  // Update item
  const updateTotal = (index: number, field: keyof Item, value: number) => {
    const updated = [...items];
    (updated[index][field] as number) = value;
    updated[index].total_cost = updated[index].qty * updated[index].unit_cost;
    setItems(updated);
    calculateTotal();
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: "",
        qty: 1,
        unit: "pcs",
        unit_cost: 0,
        total_cost: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setError("At least one item is required.");
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    calculateTotal();
  };

  // AI Slot-Filling
  const handleAiDraft = async () => {
    if (!aiInput.trim()) {
      setError("Please describe what you need to procure.");
      return;
    }

    setAiDrafting(true);
    setError(null);

    try {
      const response = await fetch("/api/slot-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: aiInput }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.extracted) {
        const ext = data.extracted;

        setFormData(prev => ({
          ...prev,
          purpose: ext.purpose || prev.purpose,
          department: ext.department || prev.department,
          total_amount: ext.total_amount || prev.total_amount,
        }));

        if (ext.items && ext.items.length > 0) {
          const newItems = ext.items.map((item: any) => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            description: item.item_description || "",
            qty: item.quantity || 1,
            unit: item.unit || "pcs",
            unit_cost: item.unit_cost || 0,
            total_cost: item.total_cost || (item.quantity || 1) * (item.unit_cost || 0),
          }));
          setItems(newItems);
          calculateTotal();
        }

        setShowAiDialog(false);
        setAiInput("");
      }
    } catch (err) {
      console.error("AI draft error:", err);
      setError("Failed to process AI request. Please try again.");
    } finally {
      setAiDrafting(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!userId) {
        setError("You must be logged in.");
        return;
      }

      if (!formData.purpose) {
        setError("Please enter a purpose/description.");
        setSubmitting(false);
        return;
      }

      if (!formData.department) {
        setError("Please select a department.");
        setSubmitting(false);
        return;
      }

      // 1. Insert purchase request
      const { data: prData, error: prError } = await supabase
        .from("purchase_requests")
        .insert({
          user_id: userId,
          department: formData.department,
          section: formData.section || null,
          purpose: formData.purpose,
          total: formData.total_amount,
          sai_no: formData.sai_no || null,
          alobs_no: formData.alobs_no || null,
          printed_name: userName,
          designation: formData.requested_by_designation || null,
          current_stage: "draft",
          pr_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (prError) {
        console.error("PR insert error:", prError);
        setError(`Failed to create PR: ${prError.message}`);
        setSubmitting(false);
        return;
      }

      // 2. Insert items
      if (prData) {
        const itemsToInsert = items
          .filter(item => item.description.trim())
          .map((item) => ({
            pr_no: prData.pr_no,
            item_description: item.description,
            quantity: item.qty,
            unit: item.unit || "pcs",
            unit_cost: item.unit_cost || 0,
            total_cost: item.total_cost || (item.qty * item.unit_cost),
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from("pr_items")
            .insert(itemsToInsert);

          if (itemsError) {
            console.error("Items insert error:", itemsError);
            setError("PR created but items could not be saved.");
            setSubmitting(false);
            return;
          }
        }

        router.push(`/dashboard/pr/${prData.pr_no}`);
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  // ============================================================
  // 6. Render
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">New Purchase Request</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAiDialog(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-purple-600/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Draft with AI
            </button>
          </div>
        </div>
      </nav>

      {/* Main Form */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* PR Number & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PR Number
                </label>
                <input
                  type="text"
                  value="Auto-generated"
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={new Date().toISOString().split("T")[0]}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Department & Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                  required
                >
                  <option value="">Select department</option>
                  <option value="College of Science and Mathematics">College of Science and Mathematics</option>
                  <option value="College of Education">College of Education</option>
                  <option value="College of Business Administration">College of Business Administration</option>
                  <option value="College of Engineering">College of Engineering</option>
                  <option value="College of Arts and Sciences">College of Arts and Sciences</option>
                  <option value="Administrative Office">Administrative Office</option>
                  <option value="Procurement Office">Procurement Office</option>
                  <option value="Office of the Chancellor">Office of the Chancellor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) =>
                    setFormData({ ...formData, section: e.target.value })
                  }
                  placeholder="e.g., IT Department"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                />
              </div>
            </div>

            {/* SAI & ALOBS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SAI No.</label>
              <input
                type="text"
                value="Auto-generated"
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ALOBs No.</label>
              <input
                type="text"
                value="Auto-generated"
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose / Description *
              </label>
              <textarea
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                placeholder="Describe the purpose of this purchase request..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                rows={2}
                required
              />
            </div>

            {/* Items Table */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Items
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Unit
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Unit Cost
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Total
                      </th>
                      <th className="px-3 py-2 text-center w-10">
                        <span className="sr-only">Delete</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index].description = e.target.value;
                              setItems(updated);
                            }}
                            placeholder="Item description..."
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) =>
                              updateTotal(index, "qty", parseInt(e.target.value) || 0)
                            }
                            min="1"
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index].unit = e.target.value;
                              setItems(updated);
                            }}
                            placeholder="pcs"
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) =>
                              updateTotal(index, "unit_cost", parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1 border border-gray-200 rounded text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                          ₱{item.total_cost.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-3 py-3 text-right font-semibold text-gray-900">
                        TOTAL:
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-blue-600">
                        ₱{formData.total_amount.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Approvals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested By
                </label>
                <input
                  type="text"
                  value={userName}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <input
                  type="text"
                  value={formData.requested_by_designation}
                  onChange={(e) =>
                    setFormData({ ...formData, requested_by_designation: e.target.value })
                  }
                  placeholder="Designation (e.g., Department Head)"
                  className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approved By
                </label>
                <input
                  type="text"
                  value={formData.approved_by}
                  onChange={(e) =>
                    setFormData({ ...formData, approved_by: e.target.value })
                  }
                  placeholder="Name of approving authority"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                />
                <input
                  type="text"
                  value={formData.approved_by_designation}
                  onChange={(e) =>
                    setFormData({ ...formData, approved_by_designation: e.target.value })
                  }
                  placeholder="Designation (e.g., Chancellor)"
                  className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Submit Purchase Request
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* AI Draft Dialog */}
      {showAiDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Draft with AI
                </h3>
              </div>
              <button
                onClick={() => setShowAiDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Describe what you need to purchase, and AI will fill the form for you.
            </p>

            <div className="space-y-3">
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Example: I need 10 laptops for the CSM department, budget around ₱500,000..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                rows={4}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAiInput("I need 10 laptops for CSM, budget ₱500,000")}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
                >
                  💻 10 laptops
                </button>
                <button
                  type="button"
                  onClick={() => setAiInput("Need 5 printers and 20 reams of paper for the admin office")}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
                >
                  🖨️ Printers & paper
                </button>
                <button
                  type="button"
                  onClick={() => setAiInput("Purchase 50 chairs and 20 tables for the new conference room")}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
                >
                  🪑 Furniture
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleAiDraft}
                disabled={aiDrafting || !aiInput.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiDrafting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Drafting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Generate Draft
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}