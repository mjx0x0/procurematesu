"use client";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import SystemBranding from "@/components/SystemBranding";

const PRESERVE_PAGE_ROUTES=["/","/auth/signup","/dashboard/new-pr","/dashboard/pr-print","/dashboard/pr/","/admin/rfq"];
export default function AppThemeShell({children}:{children:React.ReactNode}){
 const pathname=usePathname()||"";
 const preserve=PRESERVE_PAGE_ROUTES.some(route=>route.endsWith("/")?pathname.startsWith(route):pathname===route);
 if(preserve)return <>{children}</>;
 const isAdmin=pathname==="/admin"||pathname.startsWith("/admin/");
 return <div className={`app-theme ${isAdmin?"admin-shell":"portal-shell"}`}>
   <style>{`
     .portal-shell button[aria-label="Logout"]::after,
     .portal-shell button[title="Logout"]::after,
     .admin-shell button[aria-label="Logout"]::after,
     .admin-shell button[title="Logout"]::after,
     .app-sidebar button::after{content:none!important;display:none!important}

     .admin-shell .admin-pr-actions{
       grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
       gap:7px!important;
       align-items:stretch!important;
     }
     .admin-shell .admin-pr-actions > button{
       min-width:0!important;
       width:100%!important;
       min-height:38px!important;
       white-space:normal!important;
       line-height:1.12!important;
     }
     .admin-shell .admin-pr-actions > button[title*="RFQ"]{
       grid-column:1 / span 2!important;
     }
     .admin-shell .admin-pr-actions .admin-pr-icon-button{
       justify-self:center!important;
       width:38px!important;
       min-width:38px!important;
     }
   `}</style>
   {isAdmin&&<AppSidebar mode="admin"/>}
   <div className="app-theme-content">{children}</div>
   <SystemBranding/>
 </div>;
}
