"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import PRDownloadButton from "@/components/PRDownloadButton";
import { MsuLogo } from "@/components/msu-logo";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";
import { ArrowLeft, CheckCircle, Clock, FileCheck, FileText, Loader2, XCircle } from "lucide-react";

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
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth/login"); return; }
        const { data: prData, error: prError } = await supabase.from("purchase_requests").select("*").eq("pr_no", prNo).single();
        if (prError || !prData) { setError("Purchase request not found"); return; }
        setPr(prData);
        const [{ data: itemData }, { data: stageData }] = await Promise.all([
          supabase.from("pr_items").select("*").eq("pr_no", prNo).order("created_at", { ascending: true }),
          supabase.from("pr_stages_completed").select("*").eq("pr_no", prNo).order("completed_at", { ascending: true }),
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

  const saveName = async () => {
    if (!newName.trim() || newName.includes("@")) {
      setError("Please enter your actual full name, not an email address.");
      return;
    }
    setSavingName(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.from("purchase_requests").update({ printed_name: newName.trim() }).eq("pr_no", prNo);
      if (updateError) throw updateError;
      setPr(prev => prev ? { ...prev, printed_name: newName.trim() } : prev);
      setEditingName(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  const statusLabel = (status: string) => PROCUREMENT_STAGE_LABELS[status] || ({ completed: "Completed", rejected: "Rejected", cancelled: "Cancelled" } as Record<string, string>)[status] || status;
  const statusClass = (status: string) => status === "completed" ? "bg-green-100 text-green-700" : status === "rejected" || status === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  const totalAmount = items.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);

  const timelineGroups: TimelineGroup[] = (() => {
    const groups = new Map<string, TimelineGroup>();
    const getStageInfo = (stage: Stage) => {
      const cleanedName = stage.stage_name.replace(/\s+—\s+Remark\s*$/i, "").trim();
      const processStage = stage.stage_key
        ? PROCUREMENT_STAGES.find((item) => item.key === stage.stage_key)
        : PROCUREMENT_STAGES.find((item) => item.label === cleanedName || item.shortLabel === cleanedName);
      return {
        key: processStage?.key || stage.stage_key || cleanedName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        number: processStage?.number || 999,
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><Loader2 className="h-9 w-9 animate-spin text-[#7A1315]" /></div>;
  if (error || !pr) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><div className="text-center"><XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-stone-900">{error || "PR Not Found"}</h2><Link href="/dashboard" className="text-[#7A1315] font-semibold mt-3 inline-block">Back to Dashboard</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center"><div className="flex items-center gap-2"><div className="bg-[#7A1315] p-2 rounded-xl text-amber-200 border border-amber-400/30"><FileText className="h-5 w-5" /></div><span className="font-bold text-xl text-[#4D0C0D]">ProcuremateSU</span></div><Link href="/dashboard" className="text-stone-600 hover:text-[#7A1315] flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Back to Dashboard</Link></div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div><h1 className="text-2xl font-extrabold text-[#4D0C0D]">{pr.pr_no}</h1><div className="flex items-center gap-3 mt-1"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(pr.current_stage)}`}>{statusLabel(pr.current_stage)}</span><span className="text-sm text-stone-500">{new Date(pr.created_at).toLocaleString()}</span></div></div>
          <div className="flex gap-2 flex-wrap"><PRDownloadButton pr={pr} items={items} /><button onClick={() => window.print()} className="bg-stone-100 border border-stone-200 text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-200 text-sm font-medium print:hidden">Print</button></div>
        </div>

        {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

        <section className="bg-white rounded-xl shadow-sm border border-stone-300 p-4 sm:p-8 overflow-x-auto print:p-0 print:border-0 print:shadow-none">
          <div className="min-w-[700px] border-2 border-black text-black bg-white">
            <div className="border-b-2 border-black text-center py-3 px-4 relative"><div className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:block"><MsuLogo size={42} /></div><h2 className="text-xl font-black uppercase tracking-wider font-serif">PURCHASE REQUEST</h2><p className="text-sm font-bold mt-0.5 tracking-wide font-serif">MINDANAO STATE UNIVERSITY - General Santos City</p></div>
            <div className="grid grid-cols-12 border-b-2 border-black text-xs">
              <div className="col-span-6 border-r-2 border-black p-3 space-y-2"><div className="flex items-end"><span className="font-semibold w-24 shrink-0">Department</span><span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold uppercase">{pr.department || ""}</span></div><div className="flex items-end"><span className="font-semibold w-24 shrink-0">Section</span><span className="flex-1 border-b border-black pl-2 pb-0.5">{pr.section || ""}</span></div></div>
              <div className="col-span-6 p-3 space-y-2"><div className="grid grid-cols-12 gap-2 items-end"><div className="col-span-7 flex items-end"><span className="font-semibold w-16 shrink-0">PR No.</span><span className="flex-1 border-b border-black pl-2 pb-0.5 font-bold">{pr.pr_no}</span></div><div className="col-span-5 flex items-end"><span className="font-semibold w-10 shrink-0">Date</span><span className="flex-1 border-b border-black pl-1 pb-0.5 text-center">{new Date(pr.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div></div><div className="grid grid-cols-12 gap-2 items-end"><div className="col-span-7 flex items-end"><span className="font-semibold w-16 shrink-0">SAI No.</span><span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span></div><div className="col-span-5 flex items-end"><span className="font-semibold w-10 shrink-0">Date</span><span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span></div></div><div className="grid grid-cols-12 gap-2 items-end"><div className="col-span-7 flex items-end"><span className="font-semibold w-16 shrink-0">ALOBS No.</span><span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span></div><div className="col-span-5 flex items-end"><span className="font-semibold w-10 shrink-0">Date</span><span className="flex-1 border-b border-black min-h-[20px]">&nbsp;</span></div></div></div>
            </div>
            <div className="grid grid-cols-12 border-b-2 border-black text-center font-bold text-xs"><div className="col-span-1 border-r-2 border-black py-2">Quantity</div><div className="col-span-1 border-r-2 border-black py-2">Unit</div><div className="col-span-5 border-r-2 border-black py-2 italic">ITEM DESCRIPTION</div><div className="col-span-1 border-r-2 border-black py-2">Stock No.</div><div className="col-span-2 border-r-2 border-black py-2 italic">Estimated Unit Cost</div><div className="col-span-2 py-2 italic">Estimated Cost</div></div>
            <div className="divide-y divide-black text-xs">{items.map(item => <div key={item.id} className="grid grid-cols-12 min-h-[26px] items-center"><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.quantity}</div><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.unit}</div><div className="col-span-5 border-r-2 border-black py-1.5 px-2.5">{item.item_description}</div><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.stock_no || ""}</div><div className="col-span-2 border-r-2 border-black py-1.5 px-2 text-right">{Number(item.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="col-span-2 py-1.5 px-2 text-right font-semibold">{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>)}<div className="grid grid-cols-12 min-h-[24px]"><div className="col-span-1 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-5 border-r-2 border-black py-1 text-center font-bold">****Nothing Follows****</div><div className="col-span-1 border-r-2 border-black"/><div className="col-span-2 border-r-2 border-black"/><div className="col-span-2"/></div>{Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => <div key={i} className="grid grid-cols-12 min-h-[24px]"><div className="col-span-1 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-5 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-2 border-r-2 border-black"/><div className="col-span-2"/></div>)}</div>
            <div className="grid grid-cols-12 border-y-2 border-black text-xs font-semibold"><div className="col-span-10 border-r-2 border-black p-2.5"><span className="font-bold italic mr-2">Purpose</span><span className="font-normal italic">{pr.purpose || "Official university procurement"}</span></div><div className="col-span-2 p-2.5 text-right font-bold">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
            <div className="grid grid-cols-12 border-b-2 border-black text-xs font-bold text-center"><div className="col-span-6 border-r-2 border-black py-1.5">REQUESTED BY</div><div className="col-span-6 py-1.5">APPROVED BY</div></div>
            <div className="grid grid-cols-12 min-h-[96px] text-xs"><div className="col-span-6 border-r-2 border-black p-3 flex flex-col justify-end"><div className="flex mb-2"><span className="w-24">Printed Name</span>{editingName ? <div className="flex gap-2 flex-1"><input value={newName} onChange={e => setNewName(e.target.value)} className="border border-stone-400 bg-white text-gray-900 px-2 py-0.5 text-xs rounded w-full outline-none focus:ring-1 focus:ring-[#7A1315]" autoFocus /><button type="button" onClick={saveName} disabled={savingName} className="px-2 py-0.5 bg-[#7A1315] text-white text-[10px] rounded">Save</button><button type="button" onClick={() => setEditingName(false)} className="px-2 py-0.5 bg-stone-200 text-stone-700 text-[10px] rounded">Cancel</button></div> : <div className="flex gap-2"><span className="font-bold uppercase">{pr.printed_name || ""}</span><button type="button" onClick={() => { setNewName(pr.printed_name || ""); setEditingName(true); }} className="text-stone-400 text-[10px] print:hidden">Edit</button></div>}</div><div className="flex"><span className="w-24">Designation</span><span>{pr.designation || ""}</span></div></div><div className="col-span-6 p-3 flex flex-col justify-end items-center text-center"><div className="w-64 border-b border-black mb-1"/><p className="font-bold text-xs">Atty. Shidik T. Abantas, MDM, LLM</p><p>Chancellor</p></div></div>
          </div>
        </section>

        <div className="pr-timeline bg-white rounded-xl p-6 shadow-sm border border-stone-200 mt-8 mb-8 print:hidden">
          <div className="flex items-end justify-between gap-4 pb-4 mb-5 border-b border-stone-200">
            <div>
              <p className="text-[9px] font-bold tracking-[0.24em] uppercase text-[#B88E13] mb-1">MSU • PROCUREMENT FLOW</p>
              <h3 className="font-bold text-[#4D0C0D] flex items-center gap-2"><Clock className="h-5 w-5 text-[#7A1315]" />Processing Timeline</h3>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#D8C58E] bg-[#FBF7EA] px-3 py-1.5 text-[9px] font-extrabold tracking-[0.16em] text-[#8E6A08] uppercase">
              <span>{timelineGroups.length}</span> recorded stage{timelineGroups.length === 1 ? "" : "s"}
            </div>
          </div>

          {stages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 py-10 text-center text-sm text-stone-500">No stages recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {timelineGroups.map((group) => {
                const event = group.stage;
                return (
                  <article key={group.key} className="relative rounded-xl border border-stone-200 bg-[#FFFEFC] overflow-hidden shadow-[0_2px_10px_rgba(53,7,8,0.04)]">
                    <div className="flex items-start">
                      <div className="w-[68px] shrink-0 self-stretch bg-[#FBF7F0] border-r border-stone-200 flex flex-col items-center justify-start pt-5">
                        <span className="text-[9px] font-extrabold tracking-[0.16em] text-[#9A7410] uppercase">Stage</span>
                        <span className="mt-1 text-2xl leading-none font-black text-[#7A1315]">{group.stageNumber < 999 ? group.stageNumber : "—"}</span>
                      </div>

                      <div className="flex-1 min-w-0 p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-stone-400 mb-1">Process stage</p>
                            <h4 className="font-bold text-[14px] leading-snug text-[#321617]">{group.stageName}</h4>
                          </div>
                          {event && (
                            <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Completed · {new Date(event.completed_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {event?.remarks || event?.notes ? (
                          <div className="mt-4 rounded-lg border-l-2 border-[#7A1315] bg-[#FAF7F2] px-3.5 py-2.5">
                            <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#9A7410] mb-1">Stage remark</p>
                            <p className="text-xs leading-relaxed text-stone-600">{event.remarks || event.notes}</p>
                          </div>
                        ) : null}

                        {group.remarks.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-dashed border-stone-200">
                            <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-[#9A7410] mb-2">Additional remarks</p>
                            <div className="space-y-1.5">
                              {group.remarks.map((remark) => (
                                <div key={remark.id} className="flex items-start gap-2 text-xs text-stone-600">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B88E13]" />
                                  <div className="min-w-0 flex-1">
                                    <span className="leading-relaxed">{remark.remarks || remark.notes || "No remarks provided."}</span>
                                    <span className="ml-2 text-[10px] text-stone-400">{new Date(remark.completed_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
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
