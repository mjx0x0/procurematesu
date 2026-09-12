"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import RFQEditorModal from "@/components/RFQEditorModal";

export default function RFQStagePopup() {
  const pathname = usePathname();
  const [prNo, setPrNo] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) return;
    let alive = true;

    const maybeOpen = async (candidate: string) => {
      if (!candidate || !alive) return;
      const { data: rfq } = await supabase.from("rfqs").select("pr_no,created_at").eq("pr_no", candidate).maybeSingle();
      if (!alive || !rfq) return;
      const key = `procurematesu-rfq-popup:${rfq.pr_no}:${rfq.created_at}`;
      if (window.localStorage.getItem(key) === "1") return;
      setPrNo(rfq.pr_no);
    };

    const scan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const { data: profile } = await supabase.from("users").select("role,status,is_active").eq("id", user.id).maybeSingle();
      if (profile?.role !== "admin" || profile.status !== "approved" || profile.is_active !== true) return;
      const { data } = await supabase.from("purchase_requests").select("pr_no").eq("current_stage", "rfq_generation").order("created_at", { ascending: false }).limit(10);
      for (const pr of data || []) await maybeOpen(pr.pr_no);
    };

    void scan();

    const channel = supabase.channel("rfq-generation-popup")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "purchase_requests" }, async (payload) => {
        const next = payload.new as any;
        const old = payload.old as any;
        if (next?.current_stage === "rfq_generation" && old?.current_stage !== "rfq_generation") await maybeOpen(next.pr_no);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rfqs" }, async (payload) => {
        const row = payload.new as any;
        if (row?.pr_no) await maybeOpen(row.pr_no);
      })
      .subscribe();

    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [pathname]);

  if (!prNo) return null;

  return <RFQEditorModal
    prNo={prNo}
    onClose={() => {
      const closingPr = prNo;
      setPrNo(null);
      fetch(`/api/admin/rfq?prNo=${encodeURIComponent(closingPr)}`, { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data?.rfq?.created_at) window.localStorage.setItem(`procurematesu-rfq-popup:${closingPr}:${data.rfq.created_at}`, "1");
        })
        .catch(() => undefined);
    }}
  />;
}
