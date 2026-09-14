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
     /* Keep logout text single and prevent any legacy pseudo-label from duplicating it. */
     .portal-shell button[aria-label="Logout"]::after,
     .portal-shell button[title="Logout"]::after,
     .admin-shell button[aria-label="Logout"]::after,
     .admin-shell button[title="Logout"]::after,
     .app-sidebar button::after{content:none!important;display:none!important}

     /* Purchase Requests table: stable column proportions and readable type. */
     .admin-shell .admin-pr-table{
       width:100%!important;
       min-width:1200px!important;
       table-layout:fixed!important;
       border-collapse:separate!important;
       border-spacing:0!important;
     }
     .admin-shell .admin-pr-table th,
     .admin-shell .admin-pr-table td{vertical-align:middle!important}
     .admin-shell .admin-pr-table thead th{
       padding-top:12px!important;
       padding-bottom:12px!important;
       font-size:11px!important;
       line-height:1.25!important;
       font-weight:800!important;
       letter-spacing:.08em!important;
     }
     .admin-shell .admin-pr-table tbody td{
       padding-top:15px!important;
       padding-bottom:15px!important;
       font-size:13px!important;
       line-height:1.45!important;
     }
     .admin-shell .admin-pr-table th:nth-child(1),
     .admin-shell .admin-pr-table td:nth-child(1){width:135px!important}
     .admin-shell .admin-pr-table th:nth-child(2),
     .admin-shell .admin-pr-table td:nth-child(2){width:260px!important}
     .admin-shell .admin-pr-table th:nth-child(3),
     .admin-shell .admin-pr-table td:nth-child(3){width:125px!important}
     .admin-shell .admin-pr-table th:nth-child(4),
     .admin-shell .admin-pr-table td:nth-child(4){width:110px!important}
     .admin-shell .admin-pr-table th:nth-child(5),
     .admin-shell .admin-pr-table td:nth-child(5){width:220px!important}
     .admin-shell .admin-pr-table th:nth-child(6),
     .admin-shell .admin-pr-table td:nth-child(6){width:110px!important}
     .admin-shell .admin-pr-table th:nth-child(7),
     .admin-shell .admin-pr-table td:nth-child(7){width:240px!important}

     .admin-shell .admin-pr-table td:nth-child(1){font-size:13px!important;font-weight:800!important}
     .admin-shell .admin-pr-table td:nth-child(2){
       white-space:normal!important;
       overflow:hidden!important;
       text-overflow:ellipsis!important;
     }
     .admin-shell .admin-pr-table td:nth-child(3){white-space:normal!important}
     .admin-shell .admin-pr-table td:nth-child(4){font-size:13px!important;font-weight:700!important}
     .admin-shell .admin-pr-table td:nth-child(5) span{
       display:inline-flex!important;
       align-items:center!important;
       justify-content:center!important;
       max-width:100%!important;
       min-height:30px!important;
       padding:6px 9px!important;
       font-size:11px!important;
       line-height:1.25!important;
       white-space:normal!important;
       text-align:center!important;
     }

     /* Four intentional action slots. RFQ uses the full first row; the remaining
        controls stay in one aligned row with equal visual weight. */
     .admin-shell .admin-pr-actions{
       display:grid!important;
       grid-template-columns:minmax(0,1fr) minmax(0,1fr) 42px 42px!important;
       grid-auto-rows:40px!important;
       gap:8px!important;
       width:100%!important;
       align-items:stretch!important;
     }
     .admin-shell .admin-pr-actions > button{
       min-width:0!important;
       width:100%!important;
       min-height:40px!important;
       height:40px!important;
       margin:0!important;
       padding:7px 8px!important;
       border-radius:10px!important;
       white-space:normal!important;
       line-height:1.15!important;
       font-size:11px!important;
       font-weight:800!important;
       text-align:center!important;
       overflow:hidden!important;
     }
     .admin-shell .admin-pr-actions > button[title*="RFQ"]{
       grid-column:1 / -1!important;
       height:40px!important;
       min-height:40px!important;
       font-size:11.5px!important;
     }
     .admin-shell .admin-pr-actions > button[title*="RFQ"] span{white-space:nowrap!important}
     .admin-shell .admin-pr-actions .admin-pr-icon-button{
       display:inline-flex!important;
       align-items:center!important;
       justify-content:center!important;
       justify-self:stretch!important;
       width:42px!important;
       min-width:42px!important;
       max-width:42px!important;
       padding:0!important;
       color:#7C1D2E!important;
       background:#fff!important;
       border:1px solid #DDD5CC!important;
     }
     .admin-shell .admin-pr-actions .admin-pr-icon-button:hover{
       background:#FBF5F3!important;
       border-color:#CBAAA4!important;
     }
     .admin-shell .admin-pr-actions .admin-pr-delete{
       color:#B4232C!important;
       border-color:#F0C8C8!important;
     }
     .admin-shell .admin-pr-actions .admin-pr-delete:hover{
       background:#FFF1F1!important;
       border-color:#E8A9A9!important;
     }

     /* Preserve readability rather than collapsing columns on smaller windows. */
     @media (max-width:1280px){
       .admin-shell .admin-pr-table{min-width:1200px!important}
     }
     @media (max-width:760px){
       .admin-shell .admin-pr-table{min-width:1200px!important}
       .admin-shell .admin-pr-table tbody td{font-size:12px!important}
       .admin-shell .admin-pr-actions{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px 40px!important;gap:7px!important}
       .admin-shell .admin-pr-actions > button{font-size:10.5px!important}
     }
   `}</style>
   {isAdmin&&<AppSidebar mode="admin"/>}
   <div className="app-theme-content">{children}</div>
   <SystemBranding/>
 </div>;
}
