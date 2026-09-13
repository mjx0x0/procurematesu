"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import RFQEditorModal from "@/components/RFQEditorModal";

interface Step7PR {
  prNo: string;
}

/**
 * The RFQ action belongs to the Step 7 PR row itself. This component keeps
 * the dashboard clean while adding a real action beside the row's controls.
 */
export default function RFQStagePopup() {
  const [step7PRs, setStep7PRs] = useState<Step7PR[]>([]);
  const [openPrNo, setOpenPrNo] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("users")
      .select("role,status,is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" || profile.status !== "approved" || profile.is_active !== true) {
      return;
    }

    const { data: prs } = await supabase
      .from("purchase_requests")
      .select("pr_no")
      .eq("current_stage", "rfq_generation")
      .order("created_at", { ascending: false })
      .limit(20);

    setStep7PRs(
      (prs || [])
        .map((row: any) => ({ prNo: String(row.pr_no || "") }))
        .filter((row) => row.prNo)
    );
  }, []);

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel("rfq-generation-inline-actions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_requests" },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  // The PR table is rendered by the admin dashboard. We enhance only the
  // matching Step 7 rows, preserving the dashboard's existing action layout.
  useEffect(() => {
    if (!step7PRs.length) return;

    const addInlineActions = () => {
      const rows = Array.from(document.querySelectorAll("main table tbody tr"));

      rows.forEach((row) => {
        const prNo = row.querySelector("td:first-child")?.textContent?.trim();
        if (!prNo || !step7PRs.some((item) => item.prNo === prNo)) return;

        const actions = row.querySelector("td:last-child > div");
        if (!actions || actions.querySelector(`[data-rfq-action="${CSS.escape(prNo)}"]`)) return;

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.rfqAction = prNo;
        button.title = `Open RFQ Form for ${prNo}`;
        button.className = "rfq-inline-action";
        button.textContent = "RFQ Form";
        button.addEventListener("click", () => setOpenPrNo(prNo));

        // Put the RFQ action immediately before the normal workflow action.
        actions.insertBefore(button, actions.firstChild);
      });
    };

    addInlineActions();
    const observer = new MutationObserver(addInlineActions);
    const table = document.querySelector("main table");
    if (table) observer.observe(table, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.querySelectorAll("[data-rfq-action]").forEach((node) => node.remove());
    };
  }, [step7PRs]);

  const closeEditor = () => {
    setOpenPrNo(null);
    window.setTimeout(() => void refresh(), 250);
  };

  if (!openPrNo) return null;

  return (
    <RFQEditorModal
      prNo={openPrNo}
      onClose={closeEditor}
      onSaved={() => window.setTimeout(() => void refresh(), 250)}
    />
  );
}
