"use client";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import SystemBranding from "@/components/SystemBranding";
import DashboardNotificationBridge from "@/components/DashboardNotificationBridge";
const PRESERVE_PAGE_ROUTES=["/","/auth/signup","/dashboard/new-pr","/dashboard/pr-print","/dashboard/pr/","/admin/rfq"];
export default function AppThemeShell({children}:{children:React.ReactNode}){
 const pathname=usePathname()||"";
 const preserve=PRESERVE_PAGE_ROUTES.some(route=>route.endsWith("/")?pathname.startsWith(route):pathname===route||pathname.startsWith(`${route}/`));
 if(preserve)return <>{children}</>;
 const isAdmin=pathname==="/admin"||pathname.startsWith("/admin/");
 return <div className={`app-theme ${isAdmin?"admin-shell":"portal-shell"}`}><SystemBranding/><DashboardNotificationBridge/>{isAdmin&&<AppSidebar mode="admin"/>}{children}</div>;
}
