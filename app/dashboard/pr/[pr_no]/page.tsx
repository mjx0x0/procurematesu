"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PRPDF from "@/components/PRPDF";
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
  unit_cost: number;
  total_cost: number;
}

export default function PRDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prNo = params.pr_no as string;

  const [pr, setPr] = useState<PurchaseRequest | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">{error || "PR Not Found"}</h2>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">ProcuremateSU</span>
          </div>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pr.pr_no}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pr.current_stage)}`}>
                {getStatusLabel(pr.current_stage)}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(pr.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {items.length > 0 && (
              <PDFDownloadLink
                document={<PRPDF pr={pr} items={items} />}
                fileName={`PR-${pr.pr_no}.pdf`}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-green-600/30 transition-all hover:scale-105 flex items-center gap-2 text-sm"
              >
                {({ loading }) => (
                  <>
                    <FileDown className="h-4 w-4" />
                    {loading ? "Generating..." : "Download PDF"}
                  </>
                )}
              </PDFDownloadLink>
            )}
            <button
              onClick={() => window.print()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Print
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Request Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Purpose</p>
                <p className="text-gray-900">{pr.purpose}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="text-gray-900">{pr.department || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Section</p>
                  <p className="text-gray-900">{pr.section || "N/A"}</p>
                </div>
              </div>
              {pr.sai_no && (
                <div>
                  <p className="text-sm text-gray-500">SAI No.</p>
                  <p className="text-gray-900">{pr.sai_no}</p>
                </div>
              )}
              {pr.alobs_no && (
                <div>
                  <p className="text-sm text-gray-500">ALOBs No.</p>
                  <p className="text-gray-900">{pr.alobs_no}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Budget Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Items</p>
                <p className="text-gray-900">{items.length} item(s)</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requested By</p>
                <p className="text-gray-900">{pr.printed_name || "N/A"}</p>
                <p className="text-sm text-gray-500">{pr.designation || ""}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.item_description}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-center">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-center">{item.unit || "pcs"}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">₱{item.unit_cost.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">₱{item.total_cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-6 py-3 text-right font-bold text-gray-900">TOTAL:</td>
                    <td className="px-6 py-3 text-right font-bold text-blue-600">₱{totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
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
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    pr.current_stage === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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