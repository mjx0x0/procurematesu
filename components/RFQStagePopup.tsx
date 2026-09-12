"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import RFQEditorModal from "@/components/RFQEditorModal";

interface Step7PR {
  prNo: string;
  purpose: string;
  complete: boolean;
}

function isRFQFormComplete(formData: any) {
  if (!formData || typeof formData !== "object") return false;
  const requiredText = ["reference_no", "project_name", "location", "rfq_date", "purpose", "office", "instructions"];
  if (requiredText.some((key) => typeof formData[key] !== "string" || !formData[key].trim())) return false;
  if (!Array.isArray(formData.items) || formData.items.length === 0) return false;
  return formData.items.every((item: any) =>
    Number(item?.quantity) > 0 &&
    Number(item?.abc) > 0 &&
    typeof item?.technical_specifications === "string" && item.technical_specifications.trim() &&
    typeof item?.supplier_unit === "string" && item.supplier_unit.trim()
  );
}

export default function RFQStagePopup() {
  const pathname = usePathname();
  const [step7PRs, setStep7PRs] = useState<Step7PR[]>([]);
  const [openPrNo, setOpenPrNo] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pathname?.startsWith("/admin")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("users").select("role,status,is_active").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" || profile.status !== "approved" || profile.is_active !== true) return;

    const { data: prs } = await supabase.from("purchase_requests").select("pr_no,purpose").eq("current_stage", "rfq_generation").order("created_at", { ascending: false });
    const rows: Step7PR[] = [];

    for (const row of prs || []) {
      const prNo = String((row as any).pr_no || "");
      if (!prNo) continue;
      let response = await fetch(`/api/admin/rfq?prNo=${encodeURIComponent(prNo)}`, { credentials: "include", cache: "no-store" });
      if (response.status === 404) {
        await fetch("/api/admin/rfq", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prNo }) });
        response = await fetch(`/api/admin/rfq?prNo=${encodeURIComponent(prNo)}`, { credentials: "include", cache: "no-store" });
      }
      const data = response.ok ? await response.json() : null;
      rows.push({ prNo, purpose: String((row as any).purpose || ""), complete: Boolean(data && isRFQFormComplete(data.formData)) });
    }

    setStep7PRs(rows);
    const incomplete = rows.find((item) => !item.complete);
    if (!openPrNo && !dismissed && incomplete) setOpenPrNo(incomplete.prNo);
    if (openPrNo && !rows.some((item) => item.prNo === openPrNo)) setOpenPrNo(null);
  }, [pathname, openPrNo, dismissed]);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel("rfq-generation-popup")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "rfqs" }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [pathname, refresh]);

  const closeEditor = () => {
    if (!openPrNo) return;
    const closing = openPrNo;
    setOpenPrNo(null);
    setDismissed(closing);
    window.setTimeout(() => { void refresh(); }, 250);
  };

  const openEditor = (prNo: string) => { setDismissed(null); setOpenPrNo(prNo); };

  if (!pathname?.startsWith("/admin") || !step7PRs.length) return null;

  return (
    <>
      {!openPrNo && (
        <div className="fixed bottom-5 right-5 z-[90] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-amber-300 bg-amber-50 shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><AlertCircle className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-amber-900">RFQ — Step 7: Generation</p>
              <p className="text-xs text-amber-800 mt-1">Open the official RFQ form for any PR currently at Step 7. An incomplete form blocks advancement to Step 8.</p>
              <div className="mt-3 space-y-2">{step7PRs.map((pr) => <button key={pr.prNo} type="button" onClick={() => openEditor(pr.prNo)} className="w-full text-left rounded-xl border border-amber-200 bg-white px-3 py-2 hover:bg-amber-100/60 transition-colors"><span className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-[#7C1D2E]">{pr.prNo}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pr.complete ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{pr.complete ? "Form Complete" : "Form Required"}</span></span><span className="block text-xs text-stone-600 truncate mt-0.5">{pr.purpose || "Purchase Request"}</span></button>)}</div>
            </div>
          </div>
        </div>
      )}
      {openPrNo && <RFQEditorModal prNo={openPrNo} onClose={closeEditor} onSaved={() => { setDismissed(null); window.setTimeout(() => { void refresh(); }, 250); }} />}
    </>
  );
}