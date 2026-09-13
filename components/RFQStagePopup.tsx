"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import RFQEditorModal from "@/components/RFQEditorModal";

interface Step7PR {
  prNo: string;
}

/**
 * Adds the RFQ action directly to Step 7 rows. There is intentionally no
 * floating reminder/popup on the admin dashboard.
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

    if (profile?.role !== "admin" || profile.status !== "approved" || profile.is_active !== true) return;

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

  return (
    <>
      <style>{`
        .rfq-inline-action{
          display:inline-flex!important;align-items:center;justify-content:center;
          min-height:30px!important;padding:.42rem .62rem!important;border-radius:9px!important;
          border:1px solid #e5c76e!important;background:#fff8e8!important;color:#7a1315!important;
          font-family:Inter,ui-sans-serif,system-ui,sans-serif!important;font-size:8px!important;
          font-weight:800!important;line-height:1!important;white-space:nowrap!important;
          cursor:pointer!important;transition:all .16s ease!important;
        }
        .rfq-inline-action:hover{background:#fff2cc!important;border-color:#d4af37!important;transform:translateY(-1px)!important;box-shadow:0 5px 12px rgba(77,12,13,.08)!important}
        .admin-shell>.min-h-screen.bg-\\[\\#F9F7F4\\]>main>div:nth-child(4) td:last-child button[title^="Complete Step 8"]{
          font-size:8px!important;background:#fff8e8!important;border-color:#e5c76e!important;color:#7c1d2e!important;
        }
        .admin-shell>.min-h-screen.bg-\\[\\#F9F7F4\\]>main>div:nth-child(4) td:last-child button[title^="Complete Step 8"]::after{content:none!important}
        .admin-shell>.min-h-screen.bg-\\[\\#F9F7F4\\]>main>div:first-child>div:last-child button:last-child{
          min-width:112px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:.4rem!important;
        }
        .admin-shell>.min-h-screen.bg-\\[\\#F9F7F4\\]>main>div:first-child>div:last-child button:last-child::after{
          content:'Refresh'!important;display:inline!important;font-size:.7rem!important;font-weight:800!important;color:#7a1315!important;
        }
        .admin-shell>.min-h-screen.bg-\\[\\#F9F7F4\\]>nav button[title="Sign out"]{
          display:inline-flex!important;align-items:center!important;gap:.4rem!important;width:auto!important;
          padding:.45rem .65rem!important;border-radius:9px!important;
        }
        .admin-shell>.min-h-screen.bg-\\[\\#F9F7F4\\]>nav button[title="Sign out"]::after{
          content:'Logout'!important;font-size:.7rem!important;font-weight:750!important;color:#6b625f!important;
        }
        @media(max-width:560px){.rfq-inline-action{font-size:7px!important;padding:.38rem .48rem!important}}
      `}</style>
      {openPrNo && (
        <RFQEditorModal
          prNo={openPrNo}
          onClose={closeEditor}
          onSaved={() => window.setTimeout(() => void refresh(), 250)}
        />
      )}
    </>
  );
}
