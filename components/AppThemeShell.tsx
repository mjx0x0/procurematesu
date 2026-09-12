"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import SystemBranding from "@/components/SystemBranding";

const PRESERVE_PAGE_ROUTES = [
  "/",
  "/auth/signup",
  "/dashboard/new-pr",
  "/dashboard/pr-print",
  "/dashboard/pr/",
  "/admin/rfq",
];

export default function AppThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const preservePageDesign = PRESERVE_PAGE_ROUTES.some((route) =>
    route.endsWith("/") ? pathname.startsWith(route) : pathname === route || pathname.startsWith(`${route}/`)
  );

  if (preservePageDesign) return <>{children}</>;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPortalPage = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <div className={`app-theme ${isAdmin ? "admin-shell" : "portal-shell"}`}>
      <SystemBranding />
      {/* Admin keeps its dedicated navigation. End-user pages own their navigation
          inside the dashboard content so the workspace can remain uncluttered. */}
      {isAdmin && <AppSidebar mode="admin" />}
      {isPortalPage && <SystemBranding />}
      {children}
    </div>
  );
}
