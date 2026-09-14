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
  return (
    <div className={`app-theme ${isAdmin ? "admin-shell" : "portal-shell"}`}>
      <style>{`
        .portal-shell button[aria-label="Logout"]::after,
        .portal-shell button[title="Logout"]::after,
        .admin-shell button[aria-label="Logout"]::after,
        .admin-shell button[title="Logout"]::after,
        .app-sidebar button::after { content: none !important; display: none !important; }
      `}</style>
      <AppSidebar mode={isAdmin ? "admin" : "user"} />
      <div className="app-theme-content">{children}</div>
      <SystemBranding />
    </div>
  );
}
