"use client";
import React from "react";
import Link from "next/link";
import { ExternalLink,FileText,Printer,ArrowRight } from "lucide-react";

export function ChatMessageContent({content,isUser=false}:{content:string;isUser?:boolean}){
 if(isUser)return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>;
 const contactAnswer=/(contact details|contact information|official contact|office location|contact number|procurement management office \(pmo\))/i.test(content.slice(0,600));
 const clean=content.split("\n").filter(line=>{
  const t=line.trim(); if(/^#{1,6}\s*$/.test(t))return false;
  if(contactAnswer)return true;
  return !/(procurement@msugensan\.edu\.ph|\+?63\s*908\s*810\s*5634|office hours|head of (the )?procurement|sttc,?\s*mindanao state|coordinate (directly )?with (the )?(msu[- ]gensan )?procurement|using the contact details|official contact details)/i.test(t);
 });
 return <div className="space-y-2 text-sm leading-relaxed text-gray-800">{clean.map((line,i)=>{
  const t=line.trim(); if(!t)return <div key={i} className="h-1"/>;
  const heading=t.match(/^#{1,6}\s+(.+)$/); if(heading)return <div key={i} className="pt-1 text-[13px] font-bold text-[#4D0C0D]">{inline(heading[1])}</div>;
  const link=line.match(/\[([^\]]+)\]\(([^)]+)\)/); if(link){const isNew=link[2].includes("new-pr"),isPrint=link[2].includes("pr-print");return <div key={i} className="my-2"><Link href={link[2]} target={isPrint?"_blank":"_self"} rel="noopener noreferrer" className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm ${isNew?"bg-[#7A1315] hover:bg-[#5E0C0E]":isPrint?"bg-[#087449] hover:bg-[#06633e]":"bg-gray-800 hover:bg-gray-900"}`}>{isNew?<FileText className="h-4 w-4"/>:isPrint?<Printer className="h-4 w-4"/>:<ExternalLink className="h-3.5 w-3.5"/>}<span>{link[1]}</span><ArrowRight className="h-3.5 w-3.5 opacity-70"/></Link></div>}
  const bullet=/^[•\-]\s+(.+)$/.exec(t); if(bullet)return <div key={i} className="flex items-start gap-2 pl-1"><span className="mt-1 text-[#B88E13]">•</span><div className="flex-1">{inline(bullet[1])}</div></div>;
  const numbered=/^(\d+\.)\s+(.+)$/.exec(t); if(numbered)return <div key={i} className="flex items-start gap-2 pl-1"><span className="min-w-5 text-xs font-semibold text-[#7A1315]">{numbered[1]}</span><div className="flex-1">{inline(numbered[2])}</div></div>;
  if(/^https?:\/\//.test(t))return <Link key={i} href={t} target="_blank" className="text-[#7A1315] underline">{t}</Link>;
  return <div key={i}>{inline(line)}</div>;
 })}</div>;
}
function inline(text:string):React.ReactNode{
 const parts=text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
 return <>{parts.map((p,i)=>{if(/^\*\*.*\*\*$/.test(p))return <strong key={i} className="font-semibold text-gray-900">{p.slice(2,-2)}</strong>;if(/^\*.*\*$/.test(p))return <em key={i}>{p.slice(1,-1)}</em>;if(/^`.*`$/.test(p))return <code key={i} className="rounded bg-stone-100 px-1 py-0.5 text-[.9em]">{p.slice(1,-1)}</code>;return p;})}</>;
}
