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

export default function PRDownloadButton({ pr, items }: { pr: PRData; items: PRItem[] }) {
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

      const document = <PRPDF pr={pr} items={items} /> as ReactElement;
      const blob = await pdf(document).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `PR-${pr.pr_no || "Purchase-Request"}.pdf`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        disabled={downloading || items.length === 0}
        className="bg-gradient-to-r from-[#7A1315] to-[#8B1518] hover:from-[#630E10] hover:to-[#7A1315] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-semibold border border-amber-400/30 disabled:opacity-60 disabled:hover:scale-100"
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin text-amber-300" /> : <FileDown className="h-4 w-4 text-amber-300" />}
        {downloading ? "Generating PR..." : "Download PR Form"}
      </button>
      {downloadError && <p className="absolute right-0 top-full mt-1 w-64 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 z-20">{downloadError}</p>}
    </div>
  );
}
