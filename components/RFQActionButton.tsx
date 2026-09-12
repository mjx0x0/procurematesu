"use client";

import { useState } from "react";
import { FileDown, Loader2, Printer } from "lucide-react";
import type { ReactElement } from "react";
import RFQEditorModal from "@/components/RFQEditorModal";

interface RFQActionButtonProps {
  prNo: string;
  mode: "generate" | "print";
  className?: string;
}

export default function RFQActionButton({ prNo, mode, className = "" }: RFQActionButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const generate = () => setEditorOpen(true);

  const print = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/rfq?prNo=${encodeURIComponent(prNo)}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Unable to prepare the RFQ.");
      const [{ pdf }, { default: RFQPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/RFQPDF"),
      ]);
      const rfq = data.rfq;
      const pr = data.pr;
      const items = Array.isArray(data.items) ? data.items : [];
      const total = Number(data.formData?.total_abc || pr?.total || 0) || items.reduce((sum: number, item: any) => sum + Number(item.total_cost || 0), 0);
      const rfqDocument = (
        <RFQPDF
          rfq={{ ...rfq, pr_no: pr.pr_no, purpose: pr.purpose, office: pr.department, total }}
          items={items.map((item: any) => ({
            item_description: String(item.item_description || ""),
            quantity: Number(item.quantity) || 0,
            unit: String(item.unit || ""),
            unit_cost: Number(item.total_cost || 0),
            total_cost: Number(item.total_cost || 0),
          }))}
        />
      ) as unknown as ReactElement<import("@react-pdf/renderer").DocumentProps>;
      const blob = await pdf(rfqDocument).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `RFQ-${pr.pr_no}-${rfq.template_type === "less_than_50k" ? "LESS-THAN-50K" : "50K-AND-ABOVE"}.pdf`;
      anchor.style.display = "none";
      window.document.body.appendChild(anchor);
      anchor.click();
      window.setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 2000);
    } catch (err: any) {
      console.error("RFQ action failed:", err);
      setError(err?.message || "Unable to generate the RFQ PDF.");
    } finally { setBusy(false); }
  };

  return <>
    <div className={`relative ${className}`}>
      <button type="button" onClick={mode === "generate" ? generate : print} disabled={busy} className="px-3.5 py-2 rounded-xl bg-white border border-[#7C1D2E]/30 text-[#7C1D2E] text-xs font-bold flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-60" title={mode === "generate" ? "Open and edit the generated RFQ" : "Print/download the generated RFQ"}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "generate" ? <FileDown className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
        {busy ? "Preparing..." : mode === "generate" ? "Open RFQ" : "Print RFQ"}
      </button>
      {error && <div className="absolute right-0 top-full mt-1 z-30 w-80 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 shadow-lg">{error}</div>}
    </div>
    {editorOpen && <RFQEditorModal prNo={prNo} onClose={() => setEditorOpen(false)} />}
  </>;
}
