"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

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
      {(isAdmin || isPortalPage) && <AppSidebar mode={isAdmin ? "admin" : "user"} />}
      {children}
    </div>
  );
}
