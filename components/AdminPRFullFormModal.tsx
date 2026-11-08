"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import { motion } from "motion/react";
import { getFormDisplayPrNumber } from "@/lib/procurement-process";

interface PRItem { item_description?: string; quantity?: number; unit?: string; stock_no?: string; unit_cost?: number; total_cost?: number; [key: string]: unknown; }
interface PRRecord { [key: string]: unknown; pr_no?: string; current_stage?: string; department?: string; section?: string; purpose?: string; pr_date?: string; sai_no?: string; sai_date?: string; alobs_no?: string; alobs_date?: string; printed_name?: string; designation?: string; approved_by?: string; approved_by_designation?: string; total?: number; }
interface Props { prNo: string; onClose: () => void; }

const money = (v: unknown) => Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminPRFullFormModal({ prNo, onClose }: Props) {
  const [pr, setPr] = useState<PRRecord | null>(null);
  const [items, setItems] = useState<PRItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/pr-details?prNo=${encodeURIComponent(prNo)}`, { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load the Purchase Request.");
        if (active) { setPr(data.pr); setItems(data.items || []); setHistory(data.history || []); }
      } catch (e: any) { if (active) setError(e?.message || "Unable to load the Purchase Request."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [prNo]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.total_cost || 0), 0) || Number(pr?.total || 0), [items, pr]);
  const visibleMeta = useMemo(() => {
    if (!pr) return [];
    const hidden = new Set(["id", "user_id", "created_at", "updated_at", "current_stage", "current_status", "total", "sai_no", "sai_date", "alobs_no", "alobs_date"]);
    return Object.entries(pr).filter(([key, value]) => !hidden.has(key.toLowerCase()) && value !== null && value !== undefined && value !== "");
  }, [pr]);
  const currentDate = pr?.pr_date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const blankRows = Math.max(0, 6 - items.length);
  const printedName = pr?.printed_name && String(pr.printed_name).includes("@") ? String(pr.printed_name).split("@")[0].replace(/[._]/g, " ") : String(pr?.printed_name || "");

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
        <div
          role="status"
          aria-live="polite"
          className="flex w-full max-w-xs flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-2xl"
        >
          <span
            aria-hidden="true"
            className="mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-stone-200 border-t-[#7B0046] motion-reduce:animate-none"
          />
          <p className="text-sm font-bold text-[#4D002C]">Loading Purchase Request</p>
          <p className="mt-0.5 text-xs text-stone-500">Fetching official record for {prNo}...</p>
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 text-center"
        >
          <h3 className="font-bold text-[#7B0046]">Purchase Request unavailable</h3>
          <p className="mt-2 text-sm text-stone-600">{error}</p>
          <button onClick={onClose} className="mt-4 rounded-xl bg-[#7B0046] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#610037] transition-colors">
            Close
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-pr-full-form-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-6 transition-colors">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="admin-pr-full-form-modal flex h-[calc(100dvh-1rem)] max-h-[96vh] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-2xl sm:h-auto sm:rounded-2xl"
      >
        <header className="admin-pr-full-form-header flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 py-2.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="shrink-0 rounded-lg bg-[#7B0046] p-2 text-[#C27803] shadow-sm sm:rounded-xl">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold leading-tight text-[#4D002C] sm:text-lg">Complete Purchase Request</h2>
              <p className="mt-0.5 break-all font-mono text-[11px] font-bold text-[#7B0046] sm:text-xs">{prNo}</p>
              <p className="text-[10px] leading-snug text-stone-500 sm:text-xs">Read-only copy of the end-user&apos;s submitted PR for verification.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Purchase Request"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="admin-pr-full-form-body min-h-0 min-w-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-2.5 sm:p-6">
          <p className="mb-2 px-1 text-center text-[11px] font-semibold text-stone-500 md:hidden print:hidden">
            Official Purchase Request Form · Swipe left or right to view the complete form.
          </p>
          <section role="region" aria-label="Scrollable official Purchase Request form" tabIndex={0} style={{ WebkitOverflowScrolling: "touch" }} className="admin-pr-official-form-scroll w-full min-w-0 max-w-full rounded-2xl border border-stone-300 bg-white p-0 shadow-xs overflow-x-auto overscroll-x-contain touch-pan-x focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046] print:overflow-visible print:rounded-none print:border-0 print:shadow-none print:p-0">
            <div id="admin-pr-print" className="admin-pr-official-document min-w-[700px] bg-white text-black print:w-full print:min-w-0 print:box-border">
            <div className="border-2 border-black text-black">
              <div className="border-b-2 border-black px-4 py-3 text-center">
                <h1 className="font-serif text-xl font-black uppercase tracking-wider">PURCHASE REQUEST</h1>
                <p className="mt-0.5 font-serif text-sm font-bold tracking-wide">MINDANAO STATE UNIVERSITY - General Santos City</p>
              </div>

              {/* Standard header. SAI No. and ALOBS No. are retained as blank fields. */}
              <div className="grid grid-cols-12 border-b-2 border-black text-xs">
                <div className="col-span-6 border-r-2 border-black p-3">
                  <div className="flex min-h-[27px] items-end">
                    <span className="w-24 shrink-0 font-semibold">Department</span>
                    <span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold uppercase">{String(pr.department || "")}</span>
                  </div>
                  <div className="mt-1 flex min-h-[27px] items-end">
                    <span className="w-24 shrink-0 font-semibold">Section</span>
                    <span className="flex-1 border-b border-black pl-2 pb-0.5 font-medium">{String(pr.section || "")}</span>
                  </div>
                </div>
                <div className="col-span-6 p-3">
                  <div className="grid min-h-[27px] grid-cols-12 items-end gap-2">
                    <div className="col-span-7 flex items-end">
                      <span className="w-16 shrink-0 font-semibold">PR No.</span>
                      <span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold min-h-[20px]">{getFormDisplayPrNumber(String(pr.pr_no || ""), String(pr.current_stage || "")) || "\u00A0"}</span>
                    </div>
                    <div className="col-span-5 flex items-end">
                      <span className="w-10 shrink-0 font-semibold">Date</span>
                      <span className="flex-1 border-b border-black pl-1 pb-0.5 text-center font-medium">{currentDate}</span>
                    </div>
                  </div>
                  <div className="mt-1 grid min-h-[27px] grid-cols-12 items-end gap-2">
                    <div className="col-span-7 flex items-end">
                      <span className="w-16 shrink-0 font-semibold">SAI No.</span>
                      <span className="min-h-[20px] flex-1 border-b border-black pl-2 pb-0.5" />
                    </div>
                    <div className="col-span-5 flex items-end">
                      <span className="w-10 shrink-0 font-semibold">Date</span>
                      <span className="min-h-[20px] flex-1 border-b border-black pl-1 pb-0.5" />
                    </div>
                  </div>
                  <div className="mt-1 grid min-h-[27px] grid-cols-12 items-end gap-2">
                    <div className="col-span-7 flex items-end">
                      <span className="w-16 shrink-0 font-semibold">ALOBS No.</span>
                      <span className="min-h-[20px] flex-1 border-b border-black pl-2 pb-0.5" />
                    </div>
                    <div className="col-span-5 flex items-end">
                      <span className="w-10 shrink-0 font-semibold">Date</span>
                      <span className="min-h-[20px] flex-1 border-b border-black pl-1 pb-0.5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 border-b-2 border-black text-center text-xs font-bold">
                <div className="col-span-1 border-r-2 border-black px-1 py-2">Quantity</div>
                <div className="col-span-1 border-r-2 border-black px-1 py-2">Unit</div>
                <div className="col-span-5 border-r-2 border-black px-2 py-2 italic">ITEM DESCRIPTION</div>
                <div className="col-span-1 border-r-2 border-black px-1 py-2">Stock No.</div>
                <div className="col-span-2 border-r-2 border-black px-1 py-2 italic">Estimated Unit Cost</div>
                <div className="col-span-2 px-1 py-2 italic">Estimated Cost</div>
              </div>

              <div className="text-xs">
                {items.map((item, idx) => (
                  <div key={idx} className="grid min-h-[28px] grid-cols-12 items-center border-b border-black">
                    <div className="col-span-1 border-r-2 border-black px-1 py-1.5 text-center font-medium">{item.quantity ?? ""}</div>
                    <div className="col-span-1 border-r-2 border-black px-1 py-1.5 text-center font-medium">{String(item.unit || "")}</div>
                    <div className="col-span-5 border-r-2 border-black px-2.5 py-1.5">{String(item.item_description || "")}</div>
                    <div className="col-span-1 border-r-2 border-black px-1 py-1.5 text-center font-mono text-[11px]">{String(item.stock_no || "")}</div>
                    <div className="col-span-2 border-r-2 border-black px-2 py-1.5 text-right font-medium">{item.unit_cost ? money(item.unit_cost) : "-"}</div>
                    <div className="col-span-2 px-2 py-1.5 text-right font-semibold">{item.total_cost ? money(item.total_cost) : "-"}</div>
                  </div>
                ))}
                <div className="grid min-h-[26px] grid-cols-12 items-center border-b border-black">
                  <div className="col-span-1 border-r-2 border-black py-1" />
                  <div className="col-span-1 border-r-2 border-black py-1" />
                  <div className="col-span-5 border-r-2 border-black py-1 text-center text-[11px] font-bold tracking-wider">****Nothing Follows****</div>
                  <div className="col-span-1 border-r-2 border-black py-1" />
                  <div className="col-span-2 border-r-2 border-black py-1" />
                  <div className="col-span-2 py-1" />
                </div>
                {Array.from({ length: blankRows }).map((_, i) => (
                  <div key={`blank-${i}`} className="grid min-h-[26px] grid-cols-12 border-b border-black">
                    <div className="col-span-1 border-r-2 border-black" />
                    <div className="col-span-1 border-r-2 border-black" />
                    <div className="col-span-5 border-r-2 border-black" />
                    <div className="col-span-1 border-r-2 border-black" />
                    <div className="col-span-2 border-r-2 border-black" />
                    <div className="col-span-2" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 border-b-2 border-black text-xs">
                <div className="col-span-10 flex items-baseline gap-2 border-r-2 border-black p-2.5">
                  <span className="font-bold italic">Purpose</span>
                  <span className="flex-1 font-normal italic">{String(pr.purpose || "")}</span>
                </div>
                <div className="col-span-2 flex items-center justify-end p-2.5 font-bold">{money(total)}</div>
              </div>
              <div className="grid grid-cols-12 border-b-2 border-black text-center text-xs font-bold">
                <div className="col-span-2 border-r-2 border-black py-1.5" />
                <div className="col-span-4 border-r-2 border-black py-1.5">REQUESTED BY</div>
                <div className="col-span-6 py-1.5">APPROVED BY</div>
              </div>
              <div className="grid min-h-[112px] grid-cols-12 text-xs">
                <div className="col-span-2 border-r-2 border-black px-3 py-3 text-left">
                  <div className="mt-5">Signature</div>
                  <div className="mt-3">Printed Name</div>
                  <div className="mt-2">Designation</div>
                </div>
                <div className="col-span-4 border-r-2 border-black px-3 py-3">
                  <div className="h-[27px]" />
                  <div className="font-bold uppercase">{printedName}</div>
                  <div className="mt-2 font-medium">{String(pr.designation || "")}</div>
                </div>
                <div className="col-span-6 flex flex-col items-center justify-end px-3 py-3 text-center">
                  <div className="mb-1 w-64 border-b border-black" />
                  <p className="text-xs font-bold uppercase tracking-tight">{String(pr.approved_by || "Atty. Shidik T. Abantas, MDM, LLM")}</p>
                  <p className="text-[11px] text-stone-800">{String(pr.approved_by_designation || "Chancellor")}</p>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-stone-200 bg-white p-3.5 sm:mt-5 sm:p-4 print:hidden">
            <h3 className="mb-3 text-sm font-extrabold text-[#4D002C]">Submitted PR Record</h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {visibleMeta.map(([key, value]) => (
                <div key={key} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label(key)}</div>
                  <div className="mt-0.5 break-words text-xs text-stone-700">{String(value)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-3 max-w-4xl rounded-xl border border-stone-200 bg-white p-3.5 sm:mt-4 sm:p-4 print:hidden">
            <h3 className="mb-3 text-sm font-extrabold text-[#4D002C]">Procurement History</h3>
            {history.length ? (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between gap-4 border-b border-stone-100 pb-2 text-xs">
                    <span className="font-semibold">{h.stage_name}</span>
                    <span className="text-stone-500">{h.completed_at ? new Date(h.completed_at).toLocaleString() : ""}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500">No completed-stage history recorded.</p>
            )}
          </div>
        </div>
        <footer className="admin-pr-full-form-footer flex shrink-0 justify-end gap-2 border-t border-stone-200 bg-white px-3 py-2.5 sm:px-5 sm:py-3 print:hidden">
          <button onClick={() => window.print()} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#7B0046] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#610037] sm:flex-none sm:px-4">
            <Printer className="h-4 w-4" />Print PR
          </button>
          <button onClick={onClose} className="min-h-10 flex-1 rounded-lg border border-stone-200 px-3 py-2.5 text-xs font-bold transition-colors hover:bg-stone-50 sm:flex-none sm:px-4">
            Close
          </button>
        </footer>
      </motion.div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          body * {
            visibility: hidden !important;
          }

          .admin-pr-full-form-overlay,
          .admin-pr-full-form-modal,
          .admin-pr-full-form-body,
          #admin-pr-print,
          #admin-pr-print * {
            visibility: visible !important;
          }

          .admin-pr-full-form-overlay {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }

          .admin-pr-full-form-modal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            transform: none !important;
          }

          .admin-pr-full-form-header,
          .admin-pr-full-form-footer {
            display: none !important;
          }

          .admin-pr-full-form-body {
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
          }

          #admin-pr-print {
            display: block !important;
            position: static !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
