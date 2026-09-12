"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createRoot } from "react-dom/client";
import { NotificationPopover } from "@/components/NotificationPopover";

export default function DashboardNotificationBridge(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=="/dashboard")return;
  const link=document.querySelector('a[href="/dashboard/notifications"]') as HTMLElement|null;
  if(!link)return;
  const mount=document.createElement("div");
  link.replaceWith(mount);
  const root=createRoot(mount); root.render(<NotificationPopover/>);
  return()=>root.unmount();
 },[pathname]);
 return null;
}
