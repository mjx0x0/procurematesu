"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PRPDF from "@/components/PRPDF";
import { MsuLogo } from "@/components/msu-logo";
import {
  FileText,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  User,
  Calendar,
  DollarSign,
  FileCheck,
  FileDown,
} from "lucide-react";

interface PurchaseRequest {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  department: string;
  printed_name: string;
  designation: string;
  section: string;
  pr_date: string;
  created_at: string;
  updated_at: string;
  sai_no: string;
  alobs_no: string;
}

interface Stage {
  id: string;
  stage_name: string;
  notes: string;
  assigned_to: string;
  completed_at: string;
}

interface Item {
  id: string;
  item_description: string;
  quantity: number;
  unit: string;
  stock_no?: string;
  unit_cost: number;
  total_cost: number;
}

export default function PRDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prNo = (params?.pr_no as string) || "";

  const [pr, setPr] = useState<PurchaseRequest | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newNameVal, setNewNameVal] = useState("");
  const [savingName, setSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!newNameVal.trim() || newNameVal.includes("@")) {
      alert("Please enter your actual full name, not an email address.");
      return;
    }
    setSavingName(true);
    try {
      const { error: updateErr } = await supabase
        .from("purchase_requests")
        .update({ printed_name: newNameVal.trim() })
        .eq("pr_no", prNo);

      if (!updateErr) {
        setPr(prev => prev ? { ...prev, printed_name: newNameVal.trim() } : null);
        setEditingName(false);
      } else {
        alert("Failed to update name: " + updateErr.message);
      }
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Check admin
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(userData?.role === "admin");

        // Get PR
        const { data: prData, error: prError } = await supabase
          .from("purchase_requests")
          .select("*")
          .eq("pr_no", prNo)
          .single();

        if (prError) {
          setError("Purchase request not found");
          return;
        }
        setPr(prData);

        // Get items
        const { data: itemsData } = await supabase
          .from("pr_items")
          .select("*")
          .eq("pr_no", prNo);
        setItems(itemsData || []);

        // Get stages
        const { data: stagesData } = await supabase
          .from("pr_stages_completed")
          .select("*")
          .eq("pr_no", prNo)
          .order("completed_at", { ascending: true });
        setStages(stagesData || []);
      } catch (err) {
        console.error("Error loading PR:", err);
        setError("Failed to load purchase request");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [prNo, router]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      pending: "bg-yellow-100 text-yellow-600",
      for_approval: "bg-blue-100 text-blue-600",
      budget_office: "bg-purple-100 text-purple-600",
      chancellor_approval: "bg-indigo-100 text-indigo-600",
      procurement_processing: "bg-orange-100 text-orange-600",
      canvassing: "bg-pink-100 text-pink-600",
      bidding: "bg-cyan-100 text-cyan-600",
      for_award: "bg-teal-100 text-teal-600",
      po_issued: "bg-emerald-100 text-emerald-600",
      completed: "bg-green-100 text-green-600",
      cancelled: "bg-red-100 text-red-600",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      pending: "Pending",
      for_approval: "For Approval",
      budget_office: "Budget Office",
      chancellor_approval: "Chancellor Approval",
      procurement_processing: "Processing",
      canvassing: "Canvassing",
      bidding: "Bidding",
      for_award: "For Award",
      po_issued: "PO Issued",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Update this PR to "${getStatusLabel(newStatus)}"?`)) return;

    try {
      await supabase
        .from("purchase_requests")
        .update({ current_stage: newStatus })
        .eq("pr_no", prNo);

      await supabase.from("pr_stages_completed").insert({
        pr_no: prNo,
        stage_key: newStatus,
        stage_name: getStatusLabel(newStatus),
        status: "completed",
      });

      window.location.reload();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7A1315]" />
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900">{error || "PR Not Found"}</h2>
          <Link href="/dashboard" className="text-[#7A1315] font-semibold hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#7A1315] p-2 rounded-xl text-amber-200 border border-amber-400/30 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl text-[#4D0C0D]">ProcuremateSU</span>
          </div>
          <Link href="/dashboard" className="text-stone-600 hover:text-[#7A1315] flex items-center gap-2 text-sm font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#4D0C0D]">{pr.pr_no}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.current_stage)}`}>
                {getStatusLabel(pr.current_stage)}
              </span>
              <span className="text-sm text-stone-500">
                {new Date(pr.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {items.length > 0 && (
              <PDFDownloadLink
                document={<PRPDF pr={pr} items={items} />}
                fileName={`PR-${pr.pr_no}.pdf`}
                className="bg-gradient-to-r from-[#7A1315] to-[#8B1518] hover:from-[#630E10] hover:to-[#7A1315] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-semibold border border-amber-400/30"
              >
                {({ loading }) => (
                  <>
                    <FileDown className="h-4 w-4 text-amber-300" />
                    {loading ? "Generating..." : "Download PDF"}
                  </>
                )}
              </PDFDownloadLink>
            )}
            <button
              onClick={() => window.print()}
              className="bg-stone-100 border border-stone-200 text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-200 transition-colors text-sm font-medium"
            >
              Print
            </button>
          </div>
        </div>

        {/* Details and Official Form */}
        <div className="mb-8">
          {/* Official MSU-GenSan Purchase Request Document Sheet */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-300 p-4 sm:p-8 overflow-x-auto print:p-0 print:border-0 print:shadow-none">
            <div className="min-w-[700px] border-[2px] border-black text-black bg-white">
              {/* Header */}
              <div className="border-b-[2px] border-black text-center py-3 px-4 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:block">
                  <MsuLogo size={42} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-wider font-serif">
                  PURCHASE REQUEST
                </h2>
                <p className="text-sm font-bold mt-0.5 tracking-wide font-serif">
                  MINDANAO STATE UNIVERSITY - General Santos City
                </p>
              </div>

              {/* Department, Section, PR No, SAI No, ALOBS No Metadata Grid */}
              <div className="grid grid-cols-12 border-b-[2px] border-black text-xs">
                {/* Left Column: Department & Section */}
                <div className="col-span-6 border-r-[2px] border-black p-3 space-y-2">
                  <div className="flex items-end">
                    <span className="font-semibold text-stone-800 w-24 shrink-0">Department</span>
                    <span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold uppercase">
                      {pr.department || ""}
                    </span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-semibold text-stone-800 w-24 shrink-0">Section</span>
                    <span className="flex-1 border-b border-black pl-2 pb-0.5 font-medium">
                      {pr.section || ""}
                    </span>
                  </div>
                </div>

                {/* Right Column: PR No, SAI No, ALOBS No with Dates */}
                <div className="col-span-6 p-3 space-y-2">
                  {/* Row 1: PR No & Date */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7 flex items-end">
                      <span className="font-semibold text-stone-800 w-16 shrink-0">PR No.</span>
                      <span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold">
                        {pr.pr_no || ""}
                      </span>
                    </div>
                    <div className="col-span-5 flex items-end">
                      <span className="font-semibold text-stone-800 w-10 shrink-0">Date</span>
                      <span className="flex-1 border-b border-black pl-1 pb-0.5 font-medium text-center">
                        {new Date(pr.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: SAI No & Date (Left empty per official template) */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7 flex items-end">
                      <span className="font-semibold text-stone-800 w-16 shrink-0">SAI No.</span>
                      <span className="flex-1 border-b border-black pl-2 pb-0.5 font-medium min-h-[20px]">
                        &nbsp;
                      </span>
                    </div>
                    <div className="col-span-5 flex items-end">
                      <span className="font-semibold text-stone-800 w-10 shrink-0">Date</span>
                      <span className="flex-1 border-b border-black pl-1 pb-0.5 font-medium text-center min-h-[20px]">
                        &nbsp;
                      </span>
                    </div>
                  </div>

                  {/* Row 3: ALOBS No & Date (Left empty per official template) */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7 flex items-end">
                      <span className="font-semibold text-stone-800 w-16 shrink-0">ALOBS No.</span>
                      <span className="flex-1 border-b border-black pl-2 pb-0.5 font-medium min-h-[20px]">
                        &nbsp;
                      </span>
                    </div>
                    <div className="col-span-5 flex items-end">
                      <span className="font-semibold text-stone-800 w-10 shrink-0">Date</span>
                      <span className="flex-1 border-b border-black pl-1 pb-0.5 font-medium text-center min-h-[20px]">
                        &nbsp;
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Headers */}
              <div className="grid grid-cols-12 border-b-[2px] border-black text-center font-bold text-xs bg-white">
                <div className="col-span-1 border-r-[2px] border-black py-2 px-1">Quantity</div>
                <div className="col-span-1 border-r-[2px] border-black py-2 px-1">Unit</div>
                <div className="col-span-5 border-r-[2px] border-black py-2 px-2 italic">ITEM DESCRIPTION</div>
                <div className="col-span-1 border-r-[2px] border-black py-2 px-1">Stock No.</div>
                <div className="col-span-2 border-r-[2px] border-black py-2 px-1 italic">
                  Estimated Unit Cost
                </div>
                <div className="col-span-2 py-2 px-1 italic">
                  Estimated Cost
                </div>
              </div>

              {/* Table Items */}
              <div className="divide-y divide-black text-xs">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 min-h-[26px] items-center">
                    <div className="col-span-1 border-r-[2px] border-black py-1.5 px-1 text-center font-medium">
                      {item.quantity}
                    </div>
                    <div className="col-span-1 border-r-[2px] border-black py-1.5 px-1 text-center font-medium">
                      {item.unit || "pcs"}
                    </div>
                    <div className="col-span-5 border-r-[2px] border-black py-1.5 px-2.5 font-normal">
                      {item.item_description}
                    </div>
                    <div className="col-span-1 border-r-[2px] border-black py-1.5 px-1 text-center font-mono text-[11px]">
                      {item.stock_no || ""}
                    </div>
                    <div className="col-span-2 border-r-[2px] border-black py-1.5 px-2 text-right font-medium">
                      {item.unit_cost ? item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                    </div>
                    <div className="col-span-2 py-1.5 px-2 text-right font-semibold">
                      {item.total_cost ? item.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                    </div>
                  </div>
                ))}

                {/* ****Nothing Follows**** Row */}
                <div className="grid grid-cols-12 min-h-[24px] items-center">
                  <div className="col-span-1 border-r-[2px] border-black py-1"></div>
                  <div className="col-span-1 border-r-[2px] border-black py-1"></div>
                  <div className="col-span-5 border-r-[2px] border-black py-1 text-center font-bold tracking-wider text-[11px]">
                    ****Nothing Follows****
                  </div>
                  <div className="col-span-1 border-r-[2px] border-black py-1"></div>
                  <div className="col-span-2 border-r-[2px] border-black py-1"></div>
                  <div className="col-span-2 py-1"></div>
                </div>

                {/* Blank Spacer Rows to preserve standard requisition sheet layout */}
                {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
                  <div key={`blank-${i}`} className="grid grid-cols-12 min-h-[24px]">
                    <div className="col-span-1 border-r-[2px] border-black"></div>
                    <div className="col-span-1 border-r-[2px] border-black"></div>
                    <div className="col-span-5 border-r-[2px] border-black"></div>
                    <div className="col-span-1 border-r-[2px] border-black"></div>
                    <div className="col-span-2 border-r-[2px] border-black"></div>
                    <div className="col-span-2"></div>
                  </div>
                ))}
              </div>

              {/* Purpose Row */}
              <div className="grid grid-cols-12 border-t-[2px] border-b-[2px] border-black text-xs font-semibold">
                <div className="col-span-10 border-r-[2px] border-black p-2.5 flex items-baseline gap-2">
                  <span className="font-bold italic">Purpose</span>
                  <span className="font-normal italic flex-1">{pr.purpose || "Official university procurement"}</span>
                </div>
                <div className="col-span-2 p-2.5 text-right font-bold flex items-center justify-end">
                  {totalAmount > 0
                    ? totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "-"}
                </div>
              </div>

              {/* Signature Section Header */}
              <div className="grid grid-cols-12 border-b-[2px] border-black text-xs font-bold text-center">
                <div className="col-span-6 border-r-[2px] border-black py-1.5 uppercase">
                  REQUESTED BY
                </div>
                <div className="col-span-6 py-1.5 uppercase">
                  APPROVED BY
                </div>
              </div>

              {/* Signature Section Body */}
              <div className="grid grid-cols-12 min-h-[96px] text-xs">
                {/* Left: Requester Info */}
                <div className="col-span-6 border-r-[2px] border-black p-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex">
                      <span className="w-24 text-stone-700">Signature</span>
                      <span className="flex-1"></span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-24 text-stone-700">Printed Name</span>
                      {editingName ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={newNameVal}
                            onChange={(e) => setNewNameVal(e.target.value)}
                            placeholder="Enter actual full name"
                            className="border border-stone-300 px-2 py-0.5 text-xs rounded font-bold uppercase w-full bg-stone-50"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveName}
                            disabled={savingName}
                            className="px-2 py-0.5 bg-[#7A1315] text-white text-[10px] rounded font-semibold hover:bg-[#630E10]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingName(false)}
                            className="px-2 py-0.5 bg-stone-200 text-stone-700 text-[10px] rounded hover:bg-stone-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold uppercase">
                            {pr.printed_name && pr.printed_name.includes("@")
                              ? pr.printed_name.split("@")[0].replace(/[._]/g, " ")
                              : (pr.printed_name || "")}
                          </span>
                          <button
                            onClick={() => {
                              setNewNameVal(
                                pr.printed_name && pr.printed_name.includes("@")
                                  ? pr.printed_name.split("@")[0].replace(/[._]/g, " ")
                                  : (pr.printed_name || "")
                              );
                              setEditingName(true);
                            }}
                            className="text-stone-400 hover:text-[#7A1315] text-[10px] px-1 py-0.5 rounded border border-transparent hover:border-stone-300 transition-colors print:hidden"
                            title="Edit to actual full name"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex">
                      <span className="w-24 text-stone-700">Designation</span>
                      <span className="font-medium flex-1">{pr.designation || ""}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Approver (Chancellor) */}
                <div className="col-span-6 p-3 flex flex-col justify-end items-center text-center">
                  <div className="w-64 border-b border-black mb-1"></div>
                  <p className="font-bold text-xs uppercase tracking-tight">
                    Atty. Shidik T. Abantas, MDM, LLM
                  </p>
                  <p className="text-[11px] text-stone-800">
                    Chancellor
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200/90 mb-8">
          <h3 className="font-bold text-[#4D0C0D] mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#7A1315]" />
            Processing Timeline
          </h3>
          {stages.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No stages recorded yet.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex gap-4 mb-6 last:mb-0">
                  <div className="relative z-10">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-medium text-gray-900">{stage.stage_name}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(stage.completed_at).toLocaleString()}
                      </span>
                    </div>
                    {stage.notes && <p className="text-sm text-gray-600 mt-1">{stage.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Status Update */}
        {isAdmin && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200/90">
            <h3 className="font-bold text-[#4D0C0D] mb-3 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-[#7A1315]" />
              Update Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                "pending",
                "for_approval",
                "budget_office",
                "chancellor_approval",
                "procurement_processing",
                "canvassing",
                "bidding",
                "for_award",
                "po_issued",
                "completed",
                "cancelled",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={pr.current_stage === status}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pr.current_stage === status
                      ? "bg-[#7A1315] text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}