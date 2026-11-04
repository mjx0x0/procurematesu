"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import PRDownloadButton from "@/components/PRDownloadButton";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS, getFormDisplayPrNumber } from "@/lib/procurement-process";
import { AlertCircle, Building2, Calendar, CheckCircle, Clock, FileCheck, Loader2, MessageSquare, Printer, XCircle } from "lucide-react";

interface PurchaseRequest {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  department: string;
  printed_name: string;
  designation: string;
  section: string | null;
  pr_date: string;
  created_at: string;
  updated_at: string;
  sai_no: string | null;
  alobs_no: string | null;
}

interface Stage {
  id: string;
  stage_name: string;
  stage_key?: string;
  notes?: string | null;
  remarks?: string | null;
  status?: string;
  assigned_to?: string | null;
  completed_at: string;
}

interface Item {
  id: string;
  item_description: string;
  quantity: number;
  unit: string;
  stock_no?: string | null;
  unit_cost: number;
  total_cost: number;
}

interface TimelineGroup {
  key: string;
  stageNumber: number;
  stageName: string;
  stage?: Stage;
  remarks: Stage[];
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

  useEffect(() => {
    const load = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
        }
        if (!user) { router.push("/"); return; }
        let targetPrNo = prNo;
        let { data: prData, error: prError } = await supabase.from("purchase_requests").select("*").eq("pr_no", targetPrNo).maybeSingle();
        if (!prData) {
          // Check if this was a temporary PR that has since been updated with an official PR number
          const { data: renamedStage } = await supabase
            .from("pr_stages_completed")
            .select("pr_no")
            .ilike("remarks", `%${prNo}%`)
            .limit(1);
          if (renamedStage && renamedStage.length > 0 && renamedStage[0]?.pr_no) {
            targetPrNo = renamedStage[0].pr_no;
            const { data: updatedData } = await supabase.from("purchase_requests").select("*").eq("pr_no", targetPrNo).maybeSingle();
            prData = updatedData;
            router.replace(`/dashboard/pr/${encodeURIComponent(targetPrNo)}`);
          }
        }
        if (!prData) { setError("Purchase request not found"); return; }
        setPr(prData);
        const [{ data: itemData }, { data: stageData }] = await Promise.all([
          supabase.from("pr_items").select("*").eq("pr_no", targetPrNo).order("created_at", { ascending: true }),
          supabase.from("pr_stages_completed").select("*").eq("pr_no", targetPrNo).order("completed_at", { ascending: true }),
        ]);
        setItems(itemData || []);
        setStages(stageData || []);
      } catch (err) {
        console.error("Error loading PR:", err);
        setError("Failed to load purchase request");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [prNo, router]);

  const statusLabel = (status: string) => PROCUREMENT_STAGE_LABELS[status] || ({ completed: "Completed", rejected: "Rejected", cancelled: "Cancelled" } as Record<string, string>)[status] || status;
  const statusClass = (status: string) => {
    if (status === "draft") return "bg-stone-100 text-stone-700 border-stone-200";
    if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "rejected" || status === "cancelled") return "bg-red-50 text-red-700 border-red-200";
    const num = PROCUREMENT_STAGES.find((s) => s.key === status)?.number;
    if (num !== undefined && num >= 4) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-amber-50 text-amber-800 border-amber-200";
  };
  const totalAmount = items.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);

  const timelineGroups: TimelineGroup[] = (() => {
    const groups = new Map<string, TimelineGroup>();
    const getStageInfo = (stage: Stage) => {
      const cleanedName = stage.stage_name.replace(/\s+—\s+Remark\s*$/i, "").trim();
      const processStage = stage.stage_key
        ? PROCUREMENT_STAGES.find((item) => item.key === stage.stage_key)
        : PROCUREMENT_STAGES.find((item) => item.label === cleanedName || item.shortLabel === cleanedName);
      const isDraft = stage.stage_key === "draft" || cleanedName.toLowerCase() === "draft";
      return {
        key: processStage?.key || stage.stage_key || cleanedName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        number: isDraft ? 0 : (processStage?.number ?? 999),
        label: processStage?.label || cleanedName,
      };
    };

    for (const stage of stages) {
      const info = getStageInfo(stage);
      const isRemark = stage.status === "remark" || /\s—\sRemark\s*$/i.test(stage.stage_name);
      const existing = groups.get(info.key);

      if (!existing) {
        groups.set(info.key, {
          key: info.key,
          stageNumber: info.number,
          stageName: info.label,
          stage: isRemark ? undefined : stage,
          remarks: isRemark ? [stage] : [],
        });
      } else if (isRemark) {
        existing.remarks.push(stage);
      } else {
        existing.stage = stage;
        existing.stageName = info.label;
      }
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.stageNumber !== b.stageNumber) return a.stageNumber - b.stageNumber;
      const aTime = a.stage?.completed_at || a.remarks[0]?.completed_at || "";
      const bTime = b.stage?.completed_at || b.remarks[0]?.completed_at || "";
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  })();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><Loader2 className="h-9 w-9 animate-spin text-[#7B0046]" /></div>;
  if (error || !pr) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><div className="text-center"><XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-stone-900">{error || "PR Not Found"}</h2><Link href="/dashboard/purchase-requests" className="text-[#7B0046] font-semibold mt-3 inline-block">Back to Purchase Requests</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="print:hidden">
        <SystemPageHeader titlePrimary="Purchase Requests" titleAccent="Tracking" backHref="/dashboard/purchase-requests" roleLabel="End User" containerClassName="max-w-5xl px-4" />
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 print:max-w-none print:w-full print:px-0 print:py-0">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 print:hidden">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-[#4D002C] font-mono tracking-tight">
                {pr.pr_no}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${statusClass(pr.current_stage)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusLabel(pr.current_stage)}
              </span>
            </div>
            <div className="flex items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 font-medium flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-stone-400" />
                <span>Department: <strong className="text-stone-800 font-semibold">{pr.department}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                <span>Created on {new Date(pr.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </span>
              {totalAmount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-stone-400 font-mono font-bold">₱</span>
                  <span>Total: <strong className="text-[#4D002C] font-bold">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                </span>
              )}
            </div>
            {pr.pr_no?.includes("TEMP") && (
              <div className="pt-1">
                <div className="bg-amber-50/80 border border-amber-200/90 text-amber-950 p-3 sm:p-3.5 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong className="font-bold text-amber-900">Temporary Tracking Number:</strong> This request is currently assigned a temporary PR number (<code>{pr.pr_no}</code>). The official university PR control number will be assigned by the Procurement Office at <strong className="font-bold text-amber-900">Step 4 (Pre-Numbering and Control of PRs)</strong> and will update automatically here.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 hover:border-stone-400 text-stone-700 px-4 text-xs sm:text-sm font-semibold shadow-xs transition active:scale-[0.98] print:hidden whitespace-nowrap"
            >
              <Printer className="h-4 w-4 text-stone-600 shrink-0" />
              <span>Print Form</span>
            </button>
            <PRDownloadButton pr={pr} items={items} />
          </div>
        </div>

        {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-medium">{error}</div>}

        <section className="bg-white rounded-2xl shadow-xs border border-stone-300 p-4 sm:p-8 overflow-x-auto print:w-full print:min-w-0 print:overflow-visible print:p-0 print:border-0 print:shadow-none">
          <div className="min-w-[700px] border-2 border-black text-black bg-white print:w-full print:min-w-0 print:box-border">
            <div className="border-b-2 border-black text-center py-3 px-4">
              <h2 className="text-xl font-black uppercase tracking-wider font-serif">PURCHASE REQUEST</h2>
              <p className="text-sm font-bold mt-0.5 tracking-wide font-serif">MINDANAO STATE UNIVERSITY - General Santos City</p>
            </div>
            <div className="grid grid-cols-12 border-b-2 border-black text-xs">
              <div className="col-span-6 border-r-2 border-black p-3 space-y-2"><div className="flex items-end"><span className="font-semibold w-24 shrink-0">Department</span><span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold uppercase">{pr.department || ""}</span></div><div className="flex items-end"><span className="font-semibold w-24 shrink-0">Section</span><span className="flex-1 border-b border-black pl-2 pb-0.5">{pr.section || ""}</span></div></div>
              <div className="col-span-6 p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7 flex items-end">
                    <span className="font-semibold w-16 shrink-0">PR No.</span>
                    <span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold min-h-[20px]">
                      {getFormDisplayPrNumber(pr.pr_no, pr.current_stage) || "\u00A0"}
                    </span>
                  </div>
                  <div className="col-span-5 flex items-end">
                    <span className="font-semibold w-10 shrink-0">Date</span>
                    <span className="flex-1 border-b border-black pl-1 pb-0.5 text-center">
                      {new Date(pr.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7 flex items-end">
                    <span className="font-semibold w-16 shrink-0">SAI No.</span>
                    <span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span>
                  </div>
                  <div className="col-span-5 flex items-end">
                    <span className="font-semibold w-10 shrink-0">Date</span>
                    <span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7 flex items-end">
                    <span className="font-semibold w-16 shrink-0">ALOBS No.</span>
                    <span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span>
                  </div>
                  <div className="col-span-5 flex items-end">
                    <span className="font-semibold w-10 shrink-0">Date</span>
                    <span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-12 border-b-2 border-black text-center font-bold text-xs"><div className="col-span-1 border-r-2 border-black py-2">Quantity</div><div className="col-span-1 border-r-2 border-black py-2">Unit</div><div className="col-span-5 border-r-2 border-black py-2 italic">ITEM DESCRIPTION</div><div className="col-span-1 border-r-2 border-black py-2">Stock No.</div><div className="col-span-2 border-r-2 border-black py-2 italic">Estimated Unit Cost</div><div className="col-span-2 py-2 italic">Estimated Cost</div></div>
            <div className="divide-y divide-black text-xs">{items.map(item => <div key={item.id} className="grid grid-cols-12 min-h-[26px] items-center"><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.quantity}</div><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.unit}</div><div className="col-span-5 border-r-2 border-black py-1.5 px-2.5">{item.item_description}</div><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.stock_no || ""}</div><div className="col-span-2 border-r-2 border-black py-1.5 px-2 text-right">{Number(item.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="col-span-2 py-1.5 px-2 text-right font-semibold">{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>)}<div className="grid grid-cols-12 min-h-[24px]"><div className="col-span-1 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-5 border-r-2 border-black py-1 text-center font-bold">****Nothing Follows****</div><div className="col-span-1 border-r-2 border-black"/><div className="col-span-2 border-r-2 border-black"/><div className="col-span-2"/></div>{Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => <div key={i} className="grid grid-cols-12 min-h-[24px]"><div className="col-span-1 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-5 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-2 border-r-2 border-black"/><div className="col-span-2"/></div>)}</div>
            <div className="grid grid-cols-12 border-y-2 border-black text-xs font-semibold"><div className="col-span-10 border-r-2 border-black p-2.5"><span className="font-bold italic mr-2">Purpose</span><span className="font-normal italic">{pr.purpose || "Official university procurement"}</span></div><div className="col-span-2 p-2.5 text-right font-bold">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
            <div className="grid grid-cols-12 border-b-2 border-black text-xs font-bold text-center"><div className="col-span-6 border-r-2 border-black py-1.5">REQUESTED BY</div><div className="col-span-6 py-1.5">APPROVED BY</div></div>
            <div className="grid grid-cols-12 min-h-[96px] text-xs">
              <div className="col-span-6 border-r-2 border-black p-3 flex flex-col justify-end">
                <div className="flex mb-2">
                  <span className="w-24">Printed Name</span>
                  <span className="font-bold uppercase">{pr.printed_name || ""}</span>
                </div>
                <div className="flex">
                  <span className="w-24">Designation</span>
                  <span>{pr.designation || ""}</span>
                </div>
              </div>
              <div className="col-span-6 p-3 flex flex-col justify-end items-center text-center">
                <div className="w-64 border-b border-black mb-1" />
                <p className="font-bold text-xs">Atty. Shidik T. Abantas, MDM, LLM</p>
                <p>Chancellor</p>
              </div>
            </div>
          </div>
          {pr.pr_no && !getFormDisplayPrNumber(pr.pr_no, pr.current_stage) && (
            <div className="mt-2 text-right text-[11px] text-stone-500 font-mono print:text-[9px]">
              System Tracking Ref: {pr.pr_no}
            </div>
          )}
        </section>

        <div className="pr-timeline rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mt-8 mb-8 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7B0046]/10 text-[#7B0046] border border-[#7B0046]/15">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#4D002C] tracking-tight">Processing Timeline</h3>
                <p className="text-xs text-stone-500">Official log of completed procurement stages and office remarks</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{timelineGroups.length} recorded milestone{timelineGroups.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          {stages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/60 py-12 px-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-3">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-stone-700">No timeline entries recorded yet</p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">Milestones will appear here automatically as your purchase request progresses through the procurement workflow.</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200 space-y-6">
              {timelineGroups.map((group) => {
                const event = group.stage;
                const stageBadgeLabel = group.stageNumber === 0 
                  ? "Draft Stage" 
                  : group.stageNumber < 999 
                    ? `Stage ${group.stageNumber}` 
                    : "Milestone";

                return (
                  <div key={group.key} className="relative group/timeline">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 sm:-left-8 top-1.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white border-2 border-emerald-500 text-emerald-600 shadow-xs z-10">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-emerald-50 text-emerald-600" />
                    </div>

                    <article className="rounded-xl border border-stone-200/90 bg-[#FFFEFC] hover:border-stone-300 transition-colors p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-[#7B0046] bg-[#7B0046]/8 border border-[#7B0046]/15">
                            {stageBadgeLabel}
                          </span>
                          <h4 className="font-bold text-sm sm:text-base text-stone-900 leading-snug">
                            {group.stageName}
                          </h4>
                        </div>
                        {event && (
                          <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>
                              Completed · {new Date(event.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {new Date(event.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                      </div>

                      {event?.remarks || event?.notes ? (
                        <div className="mt-3.5 rounded-lg border border-stone-200/80 bg-stone-50/80 p-3 sm:p-3.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#7B0046] mb-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>Stage Remark</span>
                          </div>
                          <p className="text-xs leading-relaxed text-stone-700">{event.remarks || event.notes}</p>
                        </div>
                      ) : null}

                      {group.remarks.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-stone-100">
                          <p className="text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-2">Additional Remarks</p>
                          <div className="space-y-2">
                            {group.remarks.map((remark) => (
                              <div key={remark.id} className="flex items-start gap-2.5 rounded-lg bg-stone-50/50 border border-stone-100 p-2.5 text-xs">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C27803]" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                    <span className="leading-relaxed text-stone-700">{remark.remarks || remark.notes || "No remarks provided."}</span>
                                    <span className="text-[10px] text-stone-400 font-mono shrink-0">
                                      {new Date(remark.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(remark.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-xs text-stone-500 flex items-center gap-2 print:hidden"><FileCheck className="h-4 w-4" />The Download PR Form button generates only the official Purchase Request form as a PDF.</div>
      </main>
    </div>
  );
}
