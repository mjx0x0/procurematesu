"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface PRData {
  department: string;
  purpose: string;
  items: { item_description: string; quantity: number; unit: string; unit_cost: number; total_cost: number }[];
  total_amount: number;
}

export default function PRPrintContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchParams) {
      setLoading(false);
      return;
    }
    const encoded = searchParams.get("data");
    if (encoded) {
      try {
        const json = atob(decodeURIComponent(encoded));
        const parsed = JSON.parse(json);
        setData(parsed);
      } catch (e) {
        console.error("Failed to decode PR data", e);
      }
    }
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500">No PR data found.</div>
      </div>
    );
  }

  const total = data.items.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8 print:p-0">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="text-center border-b border-gray-300 pb-4 mb-6">
          <h1 className="text-2xl font-bold">PURCHASE REQUEST</h1>
          <p className="text-sm text-gray-600">Mindanao State University – General Santos City</p>
          <p className="text-sm mt-2">Date: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Department & Purpose */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-500">Department</p>
            <p className="text-lg">{data.department || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Purpose</p>
            <p className="text-lg">{data.purpose || "N/A"}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Item Description</th>
              <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Qty</th>
              <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Unit</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Unit Cost</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="px-4 py-2 text-sm">{item.item_description}</td>
                <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                <td className="px-4 py-2 text-sm text-center">{item.unit}</td>
                <td className="px-4 py-2 text-sm text-right">₱{item.unit_cost.toFixed(2)}</td>
                <td className="px-4 py-2 text-sm text-right">₱{item.total_cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-4 py-3 text-right font-bold">TOTAL:</td>
              <td className="px-4 py-3 text-right font-bold text-blue-600">₱{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Lines */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-300">
          <div>
            <p className="text-sm font-semibold text-gray-500">Requested By</p>
            <div className="mt-2 border-b border-gray-400 w-48"></div>
            <p className="text-xs text-gray-400 mt-1">Printed Name & Designation</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Approved By</p>
            <div className="mt-2 border-b border-gray-400 w-48"></div>
            <p className="text-xs text-gray-400 mt-1">Printed Name & Designation</p>
          </div>
        </div>

        {/* Print Button */}
        <div className="mt-8 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🖨️ Print PR
          </button>
          <button
            onClick={() => window.close()}
            className="ml-4 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}