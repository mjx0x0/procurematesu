"use client";

import { usePathname } from "next/navigation";

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

  return <div className={preservePageDesign ? "" : "app-theme"}>{children}</div>;
}
