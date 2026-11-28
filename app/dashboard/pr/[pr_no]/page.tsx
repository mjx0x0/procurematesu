"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import PRDownloadButton from "@/components/PRDownloadButton";
import LoadingScreen from "@/components/LoadingScreen";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import { PROCUREMENT_STAGES, PROCUREMENT_STAGE_LABELS, getFormDisplayPrNumber } from "@/lib/procurement-process";
import { AlertCircle, Building2, Calendar, CheckCircle, Clock, FileCheck, MessageSquare, Printer, Send, XCircle } from "lucide-react";

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
  physical_submitted_at?: string | null;
  physical_received_at?: string | null;
}

interface Stage {
  id: string;
  stage_name: string;
  stage_key?: string;
  notes?: string | null;
  remarks?: string | null;
  status?: string;
  assigned_to?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
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
interface PRMessage {
  id: string; sender_id: string; sender_name: string;
  sender_role: "end_user" | "admin"; message: string; created_at: string;
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
  const [printedName, setPrintedName] = useState("");
  const [savingPrintedName, setSavingPrintedName] = useState(false);
  const [printedNameMessage, setPrintedNameMessage] = useState<string | null>(null);
  const [submittingPhysical, setSubmittingPhysical] = useState(false);
  const [showPhysicalSubmitConfirm, setShowPhysicalSubmitConfirm] = useState(false);
  const [physicalSubmissionMessage, setPhysicalSubmissionMessage] = useState<string | null>(null);\n  const [messages, setMessages] = useState<PRMessage[]>([]);\n  const [newMessage, setNewMessage] = useState("");\n  const [loadingMessages, setLoadingMessages] = useState(false);\n  const [sendingMessage, setSendingMessage] = useState(false);\n  const [messageFeedback, setMessageFeedback] = useState<string | null>(null);

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
        setPrintedName(String(prData.printed_name || ""));
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

  const loadMessages = async (targetPrNo: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/pr/messages?prNo=${encodeURIComponent(targetPrNo)}`, { credentials: "include", cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load messages.");
      setMessages(Array.isArray(result.messages) ? result.messages : []);
    } catch (loadError) {
      console.error("Unable to load PR messages:", loadError);
      setMessageFeedback(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally { setLoadingMessages(false); }
  };

  const sendMessage = async () => {
    const message = newMessage.trim();
    if (!pr || !message || sendingMessage) return;
    setSendingMessage(true); setMessageFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/pr/messages", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ prNo: pr.pr_no, message }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to send message.");
      setMessages((current) => [...current, result.message]); setNewMessage("");
      setMessageFeedback("Message sent to the Procurement Office.");
    } catch (sendError) {
      setMessageFeedback(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally { setSendingMessage(false); }
  };

  const savePrintedName = async () => {
    if (!pr || pr.current_stage !== "draft" || savingPrintedName) return;
    setSavingPrintedName(true);
    setPrintedNameMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/pr/update-printed-name", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ prNo: pr.pr_no, printedName }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to update the printed name.");
      setPr((current) => current ? { ...current, printed_name: result.printed_name } : current);
      setPrintedName(result.printed_name);
      setPrintedNameMessage("Printed name updated.");
    } catch (saveError) {
      setPrintedNameMessage(saveError instanceof Error ? saveError.message : "Unable to update the printed name.");
    } finally {
      setSavingPrintedName(false);
    }
  };

  const confirmPhysicalSubmission = async () => {
    if (!pr || submittingPhysical || pr.physical_submitted_at) return;
    setSubmittingPhysical(true);
    setShowPhysicalSubmitConfirm(false);
    setPhysicalSubmissionMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/pr/confirm-physical-submission", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ prNo: pr.pr_no }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to confirm physical submission.");
      setPr((current) => current ? { ...current, physical_submitted_at: result.pr.physical_submitted_at } : current);
      setPhysicalSubmissionMessage("Your declaration has been recorded. The Procurement Office can now see this PR and must separately confirm actual receipt.");
    } catch (submitError) {
      setPhysicalSubmissionMessage(submitError instanceof Error ? submitError.message : "Unable to confirm physical submission.");
    } finally { setSubmittingPhysical(false); }
  };

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
  const currentStageInfo = PROCUREMENT_STAGES.find((stage) => stage.key === pr?.current_stage);
  const currentStageIndex = currentStageInfo ? PROCUREMENT_STAGES.findIndex((stage) => stage.key === currentStageInfo.key) : -1;
  const nextStageInfo = currentStageIndex >= 0 && currentStageIndex < PROCUREMENT_STAGES.length - 1 && !["completed", "rejected", "cancelled"].includes(pr?.current_stage || "") ? PROCUREMENT_STAGES[currentStageIndex + 1] : undefined;

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

  if (loading) return <LoadingScreen label="Loading purchase request..." />;
  if (error || !pr) return <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]"><div className="text-center"><XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-stone-900">{error || "PR Not Found"}</h2><Link href="/dashboard/purchase-requests" className="text-[#7B0046] font-semibold mt-3 inline-block">Back to Purchase Requests</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="print:hidden">
        <SystemPageHeader titlePrimary="Purchase Requests" titleAccent={pr.current_stage === "draft" ? "Draft" : "Tracking"} backHref="/dashboard/purchase-requests" roleLabel="End User" containerClassName="w-full max-w-none px-4 sm:px-6 lg:px-8" />
      </div>

      <main className="mx-auto w-full max-w-none px-4 py-5 sm:px-6 lg:px-8 print:max-w-none print:w-full print:px-0 print:py-0">
        <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-5 xl:flex-row xl:items-center print:hidden">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[22px] font-semibold leading-tight tracking-[-0.025em] text-[#4D002C] font-mono sm:text-2xl">
                {pr.pr_no}
              </p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${statusClass(pr.current_stage)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {pr.current_stage === "draft" && pr.physical_submitted_at ? "Awaiting Physical Receipt" : statusLabel(pr.current_stage)}
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
          <div className="grid w-full grid-cols-1 gap-2 sm:w-full sm:max-w-[520px] sm:grid-cols-2 sm:gap-2.5 lg:w-[520px] lg:shrink-0 print:hidden">
            {pr.current_stage === "draft" && !pr.physical_submitted_at && <Link href={"/dashboard/new-pr?edit=" + encodeURIComponent(pr.pr_no)} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#7B0046]/35 bg-white px-3 text-center text-xs font-bold text-[#7B0046] shadow-xs transition hover:border-[#7B0046] hover:bg-[#FDF2F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]/30">Edit Draft</Link>}
            {pr.current_stage === "draft" && !pr.physical_submitted_at && <button type="button" onClick={() => setShowPhysicalSubmitConfirm(true)} disabled={submittingPhysical} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#7B0046]/35 bg-white px-3 text-center text-xs font-bold leading-tight text-[#7B0046] shadow-xs transition hover:border-[#7B0046] hover:bg-[#FDF2F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]/30 disabled:opacity-60">{submittingPhysical ? "Confirming..." : "I have submitted the PR physically"}</button>}
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#7B0046]/35 bg-white px-3 text-xs font-semibold text-[#7B0046] shadow-xs transition hover:bg-[#FDF2F7] hover:border-[#7B0046] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]/30">
              <Printer className="h-4 w-4 shrink-0 text-stone-600" /><span>Print Form</span>
            </button>
            <div className="w-full [&>button]:min-h-11 [&>button]:w-full [&>button]:border [&>button]:border-[#7B0046]/35 [&>button]:!bg-white [&>button]:!text-[#7B0046] [&>button]:shadow-xs [&>button]:hover:!bg-[#FDF2F7] [&>button]:hover:!border-[#7B0046] [&>button_svg]:!text-[#7B0046]"><PRDownloadButton pr={pr} items={items} /></div>
          </div>
        </div>

        {pr.current_stage === "draft" && <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 print:hidden">
          <h2 className="font-bold text-[#4D002C]">{pr.physical_submitted_at ? "Awaiting Procurement Office Receipt" : "Private Draft — Not Yet Submitted"}</h2>
          <p className="mt-1 text-xs leading-relaxed">{pr.physical_submitted_at ? "You have declared that the printed PR was physically submitted. The Procurement Office must confirm actual receipt before Stage 1 tracking begins." : "This PR is still your private draft. You can edit and print it, but it is not yet visible in the Procurement Office logbook and no processing timeline is active."}</p>
          {physicalSubmissionMessage && <p role="status" className="mt-2 text-xs font-semibold">{physicalSubmissionMessage}</p>}
        </section>}
        <div className={pr.current_stage === "draft" ? "grid min-w-0 grid-cols-1" : "grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_400px]"}>
          <div className="min-w-0 space-y-4">
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">{error}</div>}

        <section className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-2xl border border-stone-300 bg-white p-3 shadow-xs sm:p-4 lg:p-5 print:w-full print:min-w-0 print:overflow-visible print:p-0 print:border-0 print:shadow-none">
          <div className="pr-form-screen-frame box-border w-full min-w-[760px] bg-white text-black print:w-full print:min-w-0" style={{ border: "2px solid #000000", borderTop: "2px solid #000000", borderRight: "2px solid #000000", borderBottom: "2px solid #000000", borderLeft: "2px solid #000000", outline: "1px solid #000000", outlineOffset: "-2px", boxShadow: "inset 0 0 0 1px #000000", boxSizing: "border-box" }}>
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
            <div className="divide-y divide-black text-xs">{items.map(item => <div key={item.id} className="grid grid-cols-12 min-h-[26px] items-stretch"><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.quantity}</div><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.unit}</div><div className="col-span-5 border-r-2 border-black py-1.5 px-2.5">{item.item_description}</div><div className="col-span-1 border-r-2 border-black py-1.5 text-center">{item.stock_no || ""}</div><div className="col-span-2 border-r-2 border-black py-1.5 px-2 text-right">{Number(item.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="col-span-2 py-1.5 px-2 text-right font-semibold">{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>)}<div className="grid grid-cols-12 min-h-[24px]"><div className="col-span-1 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-5 border-r-2 border-black py-1 text-center font-bold">****Nothing Follows****</div><div className="col-span-1 border-r-2 border-black"/><div className="col-span-2 border-r-2 border-black"/><div className="col-span-2"/></div>{Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => <div key={i} className="grid grid-cols-12 min-h-[24px]"><div className="col-span-1 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-5 border-r-2 border-black"/><div className="col-span-1 border-r-2 border-black"/><div className="col-span-2 border-r-2 border-black"/><div className="col-span-2"/></div>)}</div>
            <div className="grid grid-cols-12 border-y-2 border-black text-xs font-semibold"><div className="col-span-10 border-r-2 border-black p-2.5"><span className="font-bold italic mr-2">Purpose</span><span className="font-normal italic">{pr.purpose || "Official university procurement"}</span></div><div className="col-span-2 p-2.5 text-right font-bold">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
            <div className="grid grid-cols-12 border-b-2 border-black text-xs font-bold text-center"><div className="col-span-6 border-r-2 border-black py-1.5">REQUESTED BY</div><div className="col-span-6 py-1.5">APPROVED BY</div></div>
            <div className="grid grid-cols-12 min-h-[96px] text-xs">
              <div className="col-span-6 border-r-2 border-black p-3 flex flex-col justify-end">
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0">Printed Name</span>
                    {pr.current_stage === "draft" ? (
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 print:hidden">
                        <input
                          aria-label="Printed name"
                          value={printedName}
                          onChange={(event) => { setPrintedName(event.target.value); setPrintedNameMessage(null); }}
                          maxLength={120}
                          className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-xs font-bold uppercase focus:border-[#7B0046] focus:outline-none focus:ring-1 focus:ring-[#7B0046]/20"
                        />
                        <button type="button" onClick={savePrintedName} disabled={savingPrintedName || printedName.trim().length < 2 || printedName.trim() === (pr.printed_name || "")} className="rounded bg-[#7B0046] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#610037] disabled:cursor-not-allowed disabled:opacity-50">
                          {savingPrintedName ? "Saving..." : "Save"}
                        </button>
                        {printedNameMessage && <span role="status" className="w-full text-[10px] font-medium text-stone-600">{printedNameMessage}</span>}
                      </div>
                    ) : (
                      <span className="font-bold uppercase">{pr.printed_name || ""}</span>
                    )}
                    {pr.current_stage === "draft" && <span className="hidden print:inline font-bold uppercase">{printedName || pr.printed_name || ""}</span>}
                  </div>
                  {pr.current_stage === "draft" && <p className="mt-1 text-[10px] text-stone-500 print:hidden">Editable until the Procurement Office records receipt of the printed PR.</p>}
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
<div className="text-xs text-stone-500 flex items-center gap-2 print:hidden"><FileCheck className="h-4 w-4" />The Download PR Form button generates only the official Purchase Request form as a PDF.</div>
          </div>
        {pr.current_stage !== "draft" && <aside className="pr-timeline min-w-0 w-full max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-[#FCF9FB] p-4 shadow-[0_8px_24px_rgba(77,0,44,0.06)] sm:p-5 xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] print:hidden">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-stone-200/80 pb-4 mb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7B0046] text-white shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-[#4D002C]">Processing Timeline</h3>
                <p className="text-[11px] leading-relaxed text-stone-500">Official log of completed procurement stages and office remarks</p>
              </div>
            </div>
            <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#7B0046]/15 bg-[#7B0046]/5 px-3 py-1.5 text-[11px] font-semibold text-[#7B0046]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{timelineGroups.length} recorded milestone{timelineGroups.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="mb-4 min-w-0 w-full rounded-2xl border border-[#7B0046]/15 bg-white p-4 shadow-[0_2px_8px_rgba(77,0,44,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Current stage</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(pr.current_stage)}`}>{statusLabel(pr.current_stage)}</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-snug text-[#4D002C]">{currentStageInfo?.shortLabel || statusLabel(pr.current_stage)}</p>
            {currentStageInfo?.description && <p className="mt-1 break-words text-[11px] leading-relaxed text-stone-600">{currentStageInfo.description}</p>}
            {nextStageInfo && (
              <div className="mt-3 border-t border-[#7B0046]/10 pt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Next step</span>
                <p className="mt-1 text-xs font-semibold leading-snug text-stone-800">{nextStageInfo.shortLabel}</p>
              </div>
            )}
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
            <div className="relative min-w-0 space-y-3 pl-6 before:absolute before:left-[10px] before:top-3 before:bottom-3 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-emerald-300 before:via-stone-200 before:to-stone-100">
              {timelineGroups.map((group) => {
                const event = group.stage;
                const stageBadgeLabel = group.stageNumber === 0 
                  ? "Draft Stage" 
                  : group.stageNumber < 999 
                    ? `Stage ${group.stageNumber}` 
                    : "Milestone";

                return (
                  <div key={group.key} className="relative min-w-0 w-full group/timeline">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-1.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white border-2 border-emerald-500 text-emerald-600 shadow-xs z-10">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-emerald-50 text-emerald-600" />
                    </div>

                    <article className="min-w-0 w-full rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.035)] transition-all hover:border-[#7B0046]/25 hover:shadow-[0_4px_12px_rgba(77,0,44,0.06)] sm:p-4">
                      <div className="flex min-w-0 flex-col items-start gap-2">
                        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold text-[#7B0046] bg-[#F8EDF3] border border-[#EAD3DF]">
                            {stageBadgeLabel}
                          </span>
                          <h4 className="min-w-0 max-w-full break-words text-sm font-semibold leading-snug text-stone-900">
                            {group.stageName}
                          </h4>
                        </div>
                        {event && (
                          <div className="inline-flex w-full min-w-0 items-start gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-emerald-800">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="min-w-0 whitespace-normal break-words">Completed · {new Date(event.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {new Date(event.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                          </div>
                        )}
                        {event?.updated_by_name && <p className="text-[11px] font-semibold text-[#7B0046]">Updated by: {event.updated_by_name}</p>}
                      </div>

                      {event?.remarks || event?.notes ? (
                        <div className="mt-3 rounded-lg border border-stone-200/80 bg-stone-50/80 p-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#7B0046] mb-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>Stage Remark</span>
                          </div>
                          <p className="break-words text-xs leading-relaxed text-stone-700">{event.remarks || event.notes}</p>
                        </div>
                      ) : null}

                      {group.remarks.length > 0 && (
                        <div className="mt-3 min-w-0 border-t border-stone-100 pt-3">
                          <p className="text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-2">Additional Remarks</p>
                          <div className="space-y-2">
                            {group.remarks.map((remark) => (
                              <div key={remark.id} className="flex min-w-0 items-start gap-2.5 rounded-lg border border-stone-100 bg-stone-50/50 p-2.5 text-xs">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C27803]" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 flex-col items-start gap-1">
                                    <span className="min-w-0 break-words leading-relaxed text-stone-700">{remark.remarks || remark.notes || "No remarks provided."}</span>
                                    <span className="max-w-full whitespace-normal break-words text-[10px] font-mono text-stone-400">
                                      {new Date(remark.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(remark.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                    {remark.updated_by_name && <span className="text-[10px] font-semibold text-[#7B0046]">Updated by: {remark.updated_by_name}</span>}
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
          <section className="mt-5 overflow-hidden rounded-2xl border border-[#7B0046]/15 bg-white shadow-[0_3px_12px_rgba(77,0,44,0.05)]">
            <div className="flex items-center gap-3 border-b border-stone-100 bg-[#FCF8FA] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7B0046]/10 text-[#7B0046]"><MessageSquare className="h-4 w-4" /></div>
              <div className="min-w-0"><h4 className="text-sm font-bold text-[#4D002C]">Message Procurement</h4><p className="text-[10px] text-stone-500">Send a question or additional remark about this PR</p></div>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto bg-stone-50/50 p-3">
              {loadingMessages ? <p className="py-5 text-center text-xs text-stone-500">Loading conversation…</p> : messages.length === 0 ? (
                <div className="py-5 text-center"><MessageSquare className="mx-auto mb-2 h-6 w-6 text-stone-300" /><p className="text-xs font-semibold text-stone-600">No messages yet</p><p className="mt-1 text-[10px] text-stone-500">Your messages and Procurement Office replies will appear here.</p></div>
              ) : messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender_role === "end_user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] rounded-2xl px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${message.sender_role === "end_user" ? "rounded-br-md bg-[#7B0046] text-white" : "rounded-bl-md border border-stone-200 bg-white text-stone-800"}`}>
                    <p className={`mb-1 text-[10px] font-bold ${message.sender_role === "end_user" ? "text-white/75" : "text-[#7B0046]"}`}>{message.sender_role === "end_user" ? "You" : "Procurement Office"}</p>
                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{message.message}</p>
                    <p className={`mt-1.5 text-right text-[9px] ${message.sender_role === "end_user" ? "text-white/65" : "text-stone-400"}`}>{new Date(message.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="space-y-2 border-t border-stone-100 p-3">
              <textarea value={newMessage} onChange={(event) => setNewMessage(event.target.value)} maxLength={2000} rows={3} placeholder="Write your message or remark…" className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-800 outline-none transition focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/10" />
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-stone-400">{newMessage.length}/2,000</span><button type="submit" disabled={!newMessage.trim() || sendingMessage} className="inline-flex items-center gap-2 rounded-xl bg-[#7B0046] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#610037] disabled:cursor-not-allowed disabled:opacity-45"><Send className="h-3.5 w-3.5" />{sendingMessage ? "Sending…" : "Send message"}</button></div>
              {messageFeedback && <p role="status" className="text-[10px] text-stone-500">{messageFeedback}</p>}
            </form>
          </section>
        </aside>}
        </div>
      </main>

      {showPhysicalSubmitConfirm && pr && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:hidden" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="physical-submit-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046]" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#7B0046]"><AlertCircle className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><h2 id="physical-submit-title" className="text-base font-bold text-[#4D002C]">Confirm Physical Submission</h2><p className="mt-1 break-all font-mono text-[11px] text-stone-500">{pr.pr_no}</p></div>
                <button type="button" onClick={() => setShowPhysicalSubmitConfirm(false)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Close confirmation"><XCircle className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-sm text-amber-950">Have you printed, signed, and physically submitted this PR and its required supporting documents to the Procurement Office?</div>
              <p className="mt-3 text-xs leading-relaxed text-stone-600">Confirm only after handing in the printed documents. This will make the PR visible to the Procurement Office at Stage 0; Stage 1 begins only when staff confirms receipt.</p>
              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowPhysicalSubmitConfirm(false)} className="min-h-10 rounded-xl border border-stone-300 bg-white px-4 text-xs font-semibold text-stone-700 hover:bg-stone-50">Not Yet</button>
                <button type="button" onClick={() => void confirmPhysicalSubmission()} disabled={submittingPhysical} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#7B0046] px-4 text-xs font-bold text-white hover:bg-[#610037] disabled:opacity-60">{submittingPhysical ? "Confirming..." : "Yes, I Submitted the PR"}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
