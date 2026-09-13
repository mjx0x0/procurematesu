"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import RFQEditorModal from "@/components/RFQEditorModal";
import AdminPRFullFormModal from "@/components/AdminPRFullFormModal";
import { PROCUREMENT_STAGES } from "@/lib/procurement-process";

type RfqMode="generation"|"evaluation"|"printing";
const CONFIG:Record<string,{label:string;mode:RfqMode}>={
  rfq_generation:{label:"Generate RFQ",mode:"generation"},
  rfq_evaluation:{label:"Review RFQ",mode:"evaluation"},
  rfq_printing:{label:"Print RFQ",mode:"printing"},
};
const STAGES=PROCUREMENT_STAGES;
const keyOf=(s:string)=>Array.from(s).map(ch=>ch.charCodeAt(0).toString(16)).join("");
const escapeHtml=(value:string)=>value.replace(/[&<>\"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]||ch));
const stageIndex=(stage:string)=>STAGES.findIndex(s=>s.key===stage);

export default function AdminWorkflowBridge(){
  const [targets,setTargets]=useState<Array<{prNo:string;stage:string}>>([]);
  const [rfq,setRfq]=useState<{prNo:string;mode:RfqMode}|null>(null);
  const [pr,setPr]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const {data:p}=await supabase.from("users").select("role,status,is_active").eq("id",user.id).maybeSingle();
    if(p?.role!=="admin"||p.status!=="approved"||p.is_active!==true)return;
    const {data}=await supabase.from("purchase_requests").select("pr_no,current_stage").in("current_stage",Object.keys(CONFIG));
    setTargets((data||[]).map((x:any)=>({prNo:String(x.pr_no||""),stage:String(x.current_stage||"")})).filter(x=>x.prNo&&x.stage));
  },[]);

  useEffect(()=>{
    void refresh();
    const c=supabase.channel("admin-workflow-bridge").on("postgres_changes",{event:"*",schema:"public",table:"purchase_requests"},()=>void refresh()).subscribe();
    return()=>{void supabase.removeChannel(c)};
  },[refresh]);

  useEffect(()=>{
    let disposed=false;
    const enhanceDetailsModal=async()=>{
      const modals=Array.from(document.querySelectorAll(".fixed.inset-0")) as HTMLElement[];
      const modal=modals.find(el=>/RECORDED STAGE TIMELINE/i.test(el.textContent||"")&&/CURRENT STAGE/i.test(el.textContent||""));
      if(!modal)return;
      const match=(modal.textContent||"").match(/PR\s+(PR-\d{4}-\d+)/i);
      const prNo=match?.[1];
      if(!prNo)return;

      const actionButtons=Array.from(modal.querySelectorAll("button")) as HTMLButtonElement[];
      const completeButton=actionButtons.find(b=>/Complete Next Stage/i.test(b.textContent||""));
      const actionRow=completeButton?.parentElement;
      if(actionRow&&!actionRow.querySelector(`[data-full-pr-modal-key="${keyOf(prNo)}"]`)){
        const button=document.createElement("button");
        button.type="button";
        button.dataset.fullPrModalKey=keyOf(prNo);
        button.className="admin-detail-pr-btn";
        button.title="View the complete submitted Purchase Request form";
        button.textContent="View Submitted PR";
        button.onclick=()=>setPr(prNo);
        actionRow.insertBefore(button,completeButton);
      }

      const timelineLabel=Array.from(modal.querySelectorAll("*" )).find(el=>el.children.length===0&&/RECORDED STAGE TIMELINE/i.test((el.textContent||"").trim())) as HTMLElement|null;
      if(!timelineLabel)return;
      const section=timelineLabel.parentElement;
      if(!section)return;
      const existing=section.querySelector("[data-admin-stage-timeline]") as HTMLElement|null;
      if(existing?.dataset.prNo===prNo)return;
      if(section.dataset.timelineLoading===prNo)return;
      section.dataset.timelineLoading=prNo;

      try{
        const response=await fetch(`/api/admin/pr-details?prNo=${encodeURIComponent(prNo)}`,{credentials:"include",cache:"no-store"});
        const data=await response.json();
        if(!response.ok||disposed)return;
        const currentStage=String(data?.pr?.current_stage||"");
        const currentIndex=stageIndex(currentStage);
        const history=Array.isArray(data?.history)?data.history:[];
        const historyByStage=new Map<string,any>();
        history.forEach((h:any)=>{if(h?.stage_key)historyByStage.set(String(h.stage_key),h);});
        const isCompletedRequest=currentStage==="completed";
        const progressCount=isCompletedRequest?20:Math.max(0,currentIndex);
        const percent=Math.round((progressCount/20)*100);
        const currentInfo=STAGES.find(s=>s.key===currentStage);
        const headerText=isCompletedRequest?"Completed — all 20 stages finished":currentInfo?`Step ${currentInfo.number} of 20 — ${currentInfo.label}`:currentStage?currentStage.replace(/_/g," "):"Current stage unavailable";

        const wrap=document.createElement("div");
        wrap.dataset.adminStageTimeline="true";
        wrap.dataset.prNo=prNo;
        wrap.className="admin-stage-timeline";
        wrap.innerHTML=`<div class="admin-timeline-summary"><div><span class="admin-timeline-kicker">CURRENT PROGRESS</span><strong>${escapeHtml(headerText)}</strong></div><span class="admin-timeline-percent">${percent}%</span></div><div class="admin-timeline-track"><span style="width:${percent}%"></span></div><div class="admin-timeline-list"></div>`;
        const list=wrap.querySelector(".admin-timeline-list") as HTMLElement;

        STAGES.forEach((stage,index)=>{
          const historyItem=historyByStage.get(stage.key);
          const isCurrent=!isCompletedRequest&&stage.key===currentStage;
          const completed=isCompletedRequest||(!isCurrent&&currentIndex>index)||(!!historyItem&&!isCurrent);
          const state=isCurrent?"current":completed?"completed":"pending";
          const date=historyItem?.completed_at?new Date(historyItem.completed_at).toLocaleString():"";
          const row=document.createElement("div");
          row.className=`admin-timeline-item ${state}`;
          row.innerHTML=`<div class="admin-timeline-dot">${isCurrent?"●":completed?"✓":stage.number}</div><div class="admin-timeline-copy"><div class="admin-timeline-step">STEP ${stage.number} <span>${state.toUpperCase()}</span></div><div class="admin-timeline-name">${escapeHtml(stage.label)}</div>${date?`<div class="admin-timeline-date">Completed ${escapeHtml(date)}</div>`:""}</div>`;
          list.appendChild(row);
        });

        const terminal=currentStage==="rejected"||currentStage==="cancelled";
        if(terminal){
          const terminalRow=document.createElement("div");
          terminalRow.className="admin-timeline-terminal";
          terminalRow.textContent=currentStage==="rejected"?"PROCESS TERMINATED — Purchase Request rejected":"PROCESS TERMINATED — Purchase Request cancelled";
          list.appendChild(terminalRow);
        }

        existing?.remove();
        Array.from(section.children).forEach(child=>{if(child!==timelineLabel)child.remove();});
        section.appendChild(wrap);
        delete section.dataset.timelineLoading;
      }catch(error){
        console.error("Failed to build admin stage timeline:",error);
        delete section.dataset.timelineLoading;
      }
    };

    const mount=()=>{
      document.querySelectorAll("main table tbody tr").forEach(row=>{
        const prNo=row.querySelector("td:first-child")?.textContent?.trim()||"";
        if(!prNo)return;
        const actions=row.querySelector("td:last-child > div") as HTMLElement|null;
        if(!actions)return;

        if(!actions.querySelector(`[data-full-pr-key="${keyOf(prNo)}"]`)){
          const b=document.createElement("button");
          b.type="button";
          b.dataset.fullPrKey=keyOf(prNo);
          b.className="admin-workflow-action admin-full-pr-btn";
          b.title="View complete Purchase Request";
          b.textContent="Full PR";
          b.onclick=()=>setPr(prNo);
          actions.insertBefore(b,actions.firstChild);
        }

        const target=targets.find(x=>x.prNo===prNo);
        if(!target)return;
        const cfg=CONFIG[target.stage];
        if(!cfg)return;
        const existing=Array.from(actions.querySelectorAll("button")).find((n:any)=>/rfq/i.test((n.textContent||"").trim())||/rfq/i.test(n.title||"")) as HTMLElement|null;
        if(existing){
          const s=getComputedStyle(existing);
          const visible=s.display!=="none"&&s.visibility!=="hidden"&&s.opacity!=="0"&&existing.getClientRects().length>0;
          if(visible)return;
        }
        if(actions.querySelector(`[data-rfq-workflow-key="${keyOf(prNo)}"]`))return;
        const b=document.createElement("button");
        b.type="button";
        b.dataset.rfqWorkflowKey=keyOf(prNo);
        b.className="admin-workflow-action admin-rfq-workflow-btn";
        b.title=`${cfg.label} for ${prNo}`;
        b.textContent=cfg.label;
        b.onclick=async()=>{
          if(cfg.mode==="generation"){
            const r=await fetch("/api/admin/rfq",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({prNo})});
            const d=await r.json();
            if(!r.ok){window.alert(d.error||"Unable to prepare RFQ.");return}
          }
          setRfq({prNo,mode:cfg.mode});
        };
        actions.insertBefore(b,actions.firstChild);
      });
      void enhanceDetailsModal();
    };

    mount();
    const obs=new MutationObserver(mount);
    obs.observe(document.body,{childList:true,subtree:true});
    return()=>{disposed=true;obs.disconnect();document.querySelectorAll("[data-rfq-workflow-key],[data-full-pr-key],[data-full-pr-modal-key]").forEach(n=>n.remove());};
  },[targets]);

  return <><style>{`
    .admin-workflow-action{display:inline-flex!important;align-items:center;justify-content:center;min-height:34px!important;padding:.48rem .68rem!important;border-radius:.6rem!important;border:1px solid #ddd5ca!important;background:#fff!important;color:#5a1420!important;font-size:10px!important;font-weight:800!important;white-space:nowrap!important;cursor:pointer!important}
    .admin-workflow-action:hover{border-color:#9a7b2f!important;background:#fff9ec!important;color:#7c1d2e!important}
    .admin-rfq-workflow-btn{background:linear-gradient(135deg,#7c1d2e,#5a1420)!important;border-color:#7c1d2e!important;color:#fff!important}
    .admin-rfq-workflow-btn:hover{background:#4d0c0d!important;color:#fff!important}
    .admin-detail-pr-btn{display:inline-flex!important;align-items:center;justify-content:center;min-height:34px!important;padding:.48rem .72rem!important;border-radius:.6rem!important;border:1px solid #7c1d2e!important;background:#fff!important;color:#7c1d2e!important;font-size:10px!important;font-weight:800!important;white-space:nowrap!important;cursor:pointer!important}
    .admin-detail-pr-btn:hover{background:#fff8f4!important;border-color:#5a1420!important}
    .admin-stage-timeline{margin-top:12px!important;padding:14px!important;border:1px solid #e7e0d7!important;border-radius:14px!important;background:linear-gradient(180deg,#fffdf9,#faf7f2)!important;max-height:360px!important;overflow:auto!important}
    .admin-timeline-summary{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;margin-bottom:9px!important}
    .admin-timeline-summary>div{display:flex!important;flex-direction:column!important;gap:3px!important}
    .admin-timeline-kicker{font-size:9px!important;font-weight:900!important;letter-spacing:.13em!important;color:#9a7b2f!important}
    .admin-timeline-summary strong{font-size:12px!important;line-height:1.35!important;color:#5a1420!important}
    .admin-timeline-percent{font-size:11px!important;font-weight:900!important;color:#7c1d2e!important;background:#f8ece8!important;border:1px solid #ecd5d0!important;border-radius:999px!important;padding:4px 8px!important;white-space:nowrap!important}
    .admin-timeline-track{height:6px!important;border-radius:99px!important;background:#ece5dc!important;overflow:hidden!important;margin-bottom:12px!important}
    .admin-timeline-track span{display:block!important;height:100%!important;border-radius:99px!important;background:linear-gradient(90deg,#7c1d2e,#b88e13)!important}
    .admin-timeline-list{display:flex!important;flex-direction:column!important;gap:6px!important}
    .admin-timeline-item{display:grid!important;grid-template-columns:30px minmax(0,1fr)!important;gap:9px!important;align-items:center!important;padding:8px 9px!important;border:1px solid #eee8df!important;border-radius:10px!important;background:#fff!important}
    .admin-timeline-item.current{border-color:#d7a13b!important;background:#fff9e9!important;box-shadow:0 0 0 1px rgba(184,142,19,.10)!important}
    .admin-timeline-item.completed{background:#fbfaf7!important}
    .admin-timeline-item.pending{opacity:.62!important}
    .admin-timeline-dot{width:26px!important;height:26px!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#eee8df!important;color:#7d746b!important;font-size:9px!important;font-weight:900!important}
    .admin-timeline-item.completed .admin-timeline-dot{background:#e7f5ed!important;color:#16734b!important}
    .admin-timeline-item.current .admin-timeline-dot{background:#7c1d2e!important;color:#fff!important}
    .admin-timeline-copy{min-width:0!important}
    .admin-timeline-step{font-size:8px!important;font-weight:900!important;letter-spacing:.1em!important;color:#9b9289!important}
    .admin-timeline-step span{margin-left:5px!important;color:#7c1d2e!important}
    .admin-timeline-item.completed .admin-timeline-step span{color:#16734b!important}
    .admin-timeline-name{font-size:10px!important;line-height:1.35!important;font-weight:750!important;color:#413a35!important}
    .admin-timeline-date{font-size:8px!important;color:#948a80!important;margin-top:2px!important}
    .admin-timeline-terminal{padding:9px 10px!important;border-radius:10px!important;background:#fff0f0!important;border:1px solid #f0cccc!important;color:#a52b2b!important;font-size:9px!important;font-weight:900!important}
    @media(max-width:900px){.admin-workflow-action,.admin-detail-pr-btn{font-size:9px!important;padding:.42rem .52rem!important}.admin-stage-timeline{max-height:330px!important}}
    @media print{.admin-workflow-action,.admin-detail-pr-btn{display:none!important}body.printing-rfq .fixed.inset-0.z-\\[100\\]{position:static!important;background:#fff!important}body.printing-rfq .fixed.inset-0.z-\\[100\\]>div{max-height:none!important;max-width:none!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important}body.printing-rfq .rfq-print-page{break-after:page!important;page-break-after:always!important}body.printing-rfq .rfq-print-page:last-child{break-after:auto!important;page-break-after:auto!important}}
  `}</style>{rfq&&<RFQEditorModal prNo={rfq.prNo} mode={rfq.mode} onClose={()=>setRfq(null)} onSaved={()=>void refresh()}/>} {pr&&<AdminPRFullFormModal prNo={pr} onClose={()=>setPr(null)}/>}</>;
}
