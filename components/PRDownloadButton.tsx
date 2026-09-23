"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { ReactElement } from "react";

interface PRData {
  pr_no?: string;
  department?: string;
  section?: string | null;
  purpose?: string;
  total?: number;
  current_stage?: string;
  printed_name?: string;
  designation?: string | null;
  pr_date?: string;
  sai_no?: string | null;
  sai_date?: string | null;
  alobs_no?: string | null;
  alobs_date?: string | null;
  created_at?: string;
  approved_by?: string;
  approved_by_designation?: string;
}

interface PRItem {
  item_description: string;
  quantity: number;
  unit: string;
  stock_no?: string | null;
  unit_cost: number;
  total_cost: number;
}

export default function PRDownloadButton({ pr, items = [] }: { pr: PRData; items?: PRItem[] }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);

    try {
      const [{ pdf }, { default: PRPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/PRPDF"),
      ]);

      const safeItems = (Array.isArray(items) ? items : []).map(it => ({
        item_description: String(it.item_description || ""),
        quantity: Number(it.quantity) || 1,
        unit: String(it.unit || "pcs"),
        stock_no: it.stock_no ? String(it.stock_no) : "",
        unit_cost: Number(it.unit_cost) || 0,
        total_cost: Number(it.total_cost) || (Number(it.unit_cost || 0) * (Number(it.quantity) || 1)),
      }));

      const safePr = {
        ...pr,
        total: Number(pr.total) || safeItems.reduce((acc, it) => acc + it.total_cost, 0),
      };

      const pdfDocument = (<PRPDF pr={safePr} items={safeItems} /> as unknown) as ReactElement<import("@react-pdf/renderer").DocumentProps>;
      const blob = await pdf(pdfDocument).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `PR-${safePr.pr_no || "Purchase-Request"}.pdf`;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      window.document.body.appendChild(anchor);
      anchor.click();
      window.setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
      }, 2000);
    } catch (error) {
      console.error("PR PDF download failed:", error);
      setDownloadError("Unable to generate the PR PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="ui-button ui-button-primary text-xs sm:text-sm shadow-xs"
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin text-amber-300" /> : <FileDown className="h-4 w-4 text-amber-300" />}
        <span>{downloading ? "Generating PR..." : "Download PR Form"}</span>
      </button>
      {downloadError && (
        <div className="absolute right-0 top-full mt-2 w-72 text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl p-3 z-30 shadow-md">
          <p className="font-semibold mb-1">{downloadError}</p>
          <button 
            type="button" 
            onClick={() => window.print()} 
            className="text-[#7B0046] underline font-bold hover:text-[#4D002C]"
          >
            Or use Print to save as PDF
          </button>
        </div>
      )}
    </div>
  );
}
