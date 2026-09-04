"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";

interface PRItem {
  item_description: string;
  quantity: number;
  unit: string;
  stock_no?: string;
  unit_cost: number;
  total_cost: number;
}

interface PRData {
  department?: string;
  section?: string;
  purpose?: string;
  pr_no?: string;
  pr_date?: string;
  sai_no?: string;
  sai_date?: string;
  alobs_no?: string;
  alobs_date?: string;
  printed_name?: string;
  designation?: string;
  approved_by?: string;
  approved_by_designation?: string;
  items: PRItem[];
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-stone-500 font-medium">Loading Purchase Request...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-3">No PR data found or invalid link.</p>
          <Link href="/dashboard" className="text-[#7A1315] hover:underline font-semibold text-sm">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const items = data.items || [];
  const totalAmount = data.total_amount || items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  const currentDate = data.pr_date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const minRows = 6;
  const blankRows = Math.max(0, minRows - items.length);

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-4 print:p-0 print:bg-white text-black">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-stone-700 hover:text-[#7A1315] text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-[#7A1315] hover:bg-[#5E0F10] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
          >
            <Printer className="h-4 w-4 text-amber-300" />
            Print Official PR
          </button>
        </div>
      </div>

      {/* Official MSU Gensan Purchase Request Container */}
      <div className="max-w-4xl mx-auto bg-white shadow-md print:shadow-none p-6 print:p-4">
        {/* Outer Form Box matching standard COA/MSU-Gensan template */}
        <div className="border-[2px] border-black text-black">
          {/* Header */}
          <div className="border-b-[2px] border-black text-center py-3 px-4 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:block">
              <MsuLogo size={42} />
            </div>
            <h1 className="text-xl font-black uppercase tracking-wider font-serif">
              PURCHASE REQUEST
            </h1>
            <p className="text-sm font-bold mt-0.5 tracking-wide font-serif">
              MINDANAO STATE UNIVERSITY - General Santos City
            </p>
          </div>

          {/* Department, Section, PR No, SAI No, ALOBS No Metadata Grid */}
          <div className="grid grid-cols-12 border-b-[2px] border-black text-xs">
            {/* Left Column: Department & Section (5 cols) */}
            <div className="col-span-6 border-r-[2px] border-black p-3 space-y-2">
              <div className="flex items-end">
                <span className="font-semibold text-stone-800 w-24 shrink-0">Department</span>
                <span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold uppercase">
                  {data.department || ""}
                </span>
              </div>
              <div className="flex items-end">
                <span className="font-semibold text-stone-800 w-24 shrink-0">Section</span>
                <span className="flex-1 border-b border-black pl-2 pb-0.5 font-medium">
                  {data.section || ""}
                </span>
              </div>
            </div>

            {/* Right Column: PR No, SAI No, ALOBS No with Dates (6 cols) */}
            <div className="col-span-6 p-3 space-y-2">
              {/* Row 1: PR No & Date */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7 flex items-end">
                  <span className="font-semibold text-stone-800 w-16 shrink-0">PR No.</span>
                  <span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold">
                    {data.pr_no || "DRAFT"}
                  </span>
                </div>
                <div className="col-span-5 flex items-end">
                  <span className="font-semibold text-stone-800 w-10 shrink-0">Date</span>
                  <span className="flex-1 border-b border-black pl-1 pb-0.5 font-medium text-center">
                    {currentDate}
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
              <div key={idx} className="grid grid-cols-12 min-h-[28px] items-center">
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
            <div className="grid grid-cols-12 min-h-[26px] items-center">
              <div className="col-span-1 border-r-[2px] border-black py-1"></div>
              <div className="col-span-1 border-r-[2px] border-black py-1"></div>
              <div className="col-span-5 border-r-[2px] border-black py-1 text-center font-bold tracking-wider text-[11px]">
                ****Nothing Follows****
              </div>
              <div className="col-span-1 border-r-[2px] border-black py-1"></div>
              <div className="col-span-2 border-r-[2px] border-black py-1"></div>
              <div className="col-span-2 py-1"></div>
            </div>

            {/* Blank Spacer Rows */}
            {Array.from({ length: blankRows }).map((_, i) => (
              <div key={`blank-${i}`} className="grid grid-cols-12 min-h-[26px]">
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
              <span className="font-normal italic flex-1">{data.purpose || "For official MSU-GenSan procurement"}</span>
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
                <div className="flex">
                  <span className="w-24 text-stone-700">Printed Name</span>
                  <span className="font-bold uppercase flex-1">
                    {data.printed_name && data.printed_name.includes("@")
                      ? data.printed_name.split("@")[0].replace(/[._]/g, " ")
                      : (data.printed_name || "")}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-24 text-stone-700">Designation</span>
                  <span className="font-medium flex-1">{data.designation || ""}</span>
                </div>
              </div>
            </div>

            {/* Right: Approver (Chancellor) */}
            <div className="col-span-6 p-3 flex flex-col justify-end items-center text-center">
              <div className="w-64 border-b border-black mb-1"></div>
              <p className="font-bold text-xs uppercase tracking-tight">
                {data.approved_by || "Atty. Shidik T. Abantas, MDM, LLM"}
              </p>
              <p className="text-[11px] text-stone-800">
                {data.approved_by_designation || "Chancellor"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
