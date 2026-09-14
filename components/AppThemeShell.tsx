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

     /* Admin Purchase Requests: keep the table readable and give Actions a deliberate,
        compact control panel instead of a crowded inline button row. */
     html body .admin-shell .admin-dashboard-page .admin-pr-table{
       width:100%!important;
       min-width:1240px!important;
       table-layout:fixed!important;
       border-collapse:separate!important;
       border-spacing:0!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-table thead th{
       padding:13px 12px!important;
       font-size:12px!important;
       line-height:1.3!important;
       font-weight:800!important;
       letter-spacing:.055em!important;
       vertical-align:middle!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-table tbody td{
       padding:16px 12px!important;
       font-size:13.5px!important;
       line-height:1.45!important;
       vertical-align:middle!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-table th:nth-child(1),
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(1){width:145px!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table th:nth-child(2),
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(2){width:270px!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table th:nth-child(3),
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(3){width:135px!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table th:nth-child(4),
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(4){width:120px!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table th:nth-child(5),
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(5){width:225px!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table th:nth-child(6),
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(6){width:115px!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table th:nth-child(7),
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(7){width:230px!important}

     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(1){font-size:13.5px!important;font-weight:800!important;white-space:nowrap!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(2){white-space:normal!important;overflow:hidden!important;text-overflow:ellipsis!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(3){white-space:normal!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(4){font-size:13.5px!important;font-weight:700!important;white-space:nowrap!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:nth-child(5) span{
       display:inline-flex!important;
       align-items:center!important;
       justify-content:center!important;
       max-width:100%!important;
       min-height:32px!important;
       padding:6px 10px!important;
       font-size:11.5px!important;
       line-height:1.25!important;
       white-space:normal!important;
       text-align:center!important;
       border-radius:999px!important;
     }

     /* Action panel: 1 full-width workflow action, then two text actions and two icon actions. */
     html body .admin-shell .admin-dashboard-page .admin-pr-table td:last-child{
       width:230px!important;
       padding:12px 14px!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-actions{
       display:grid!important;
       grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px 44px!important;
       grid-auto-rows:42px!important;
       gap:8px!important;
       width:100%!important;
       max-width:none!important;
       align-items:stretch!important;
       margin:0!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-actions > button{
       box-sizing:border-box!important;
       min-width:0!important;
       width:100%!important;
       height:42px!important;
       min-height:42px!important;
       margin:0!important;
       padding:7px 9px!important;
       border-radius:10px!important;
       white-space:normal!important;
       line-height:1.18!important;
       font-size:11.5px!important;
       font-weight:800!important;
       text-align:center!important;
       overflow:hidden!important;
       display:inline-flex!important;
       align-items:center!important;
       justify-content:center!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-actions > button[title*="RFQ"]{
       grid-column:1 / -1!important;
       height:42px!important;
       min-height:42px!important;
       font-size:12px!important;
       letter-spacing:.01em!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-actions > button[title*="RFQ"] span{white-space:nowrap!important}
     html body .admin-shell .admin-dashboard-page .admin-pr-actions .admin-pr-icon-button{
       width:44px!important;
       min-width:44px!important;
       max-width:44px!important;
       height:42px!important;
       padding:0!important;
       display:inline-flex!important;
       align-items:center!important;
       justify-content:center!important;
       color:#7C1D2E!important;
       background:#fff!important;
       border:1px solid #DDD5CC!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-actions .admin-pr-icon-button:hover{
       background:#FBF5F3!important;
       border-color:#CBAAA4!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-actions .admin-pr-delete{
       color:#B4232C!important;
       border-color:#F0C8C8!important;
     }
     html body .admin-shell .admin-dashboard-page .admin-pr-actions .admin-pr-delete:hover{
       background:#FFF1F1!important;
       border-color:#E8A9A9!important;
     }

     @media (max-width:1280px){
       html body .admin-shell .admin-dashboard-page .admin-pr-table{min-width:1240px!important}
     }
     @media (max-width:760px){
       html body .admin-shell .admin-dashboard-page .admin-pr-table{min-width:1240px!important}
       html body .admin-shell .admin-dashboard-page .admin-pr-table tbody td{font-size:12.5px!important}
       html body .admin-shell .admin-dashboard-page .admin-pr-actions{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 42px 42px!important;gap:7px!important}
       html body .admin-shell .admin-dashboard-page .admin-pr-actions > button{font-size:11px!important}
       html body .admin-shell .admin-dashboard-page .admin-pr-actions .admin-pr-icon-button{width:42px!important;min-width:42px!important;max-width:42px!important}
     }
   `}</style>
   {isAdmin&&<AppSidebar mode="admin"/>}
   <div className="app-theme-content">{children}</div>
   <SystemBranding/>
 </div>;
}
