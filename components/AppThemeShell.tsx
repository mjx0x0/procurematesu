"use client";

import { usePathname } from "next/navigation";

const PROTECTED_FORM_ROUTES = [
  "/dashboard/new-pr",
  "/dashboard/pr-print",
  "/dashboard/pr/",
  "/admin/rfq",
];

export default function AppThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const preserveOfficialForm = PROTECTED_FORM_ROUTES.some((route) =>
    route.endsWith("/") ? pathname.startsWith(route) : pathname === route || pathname.startsWith(`${route}/`)
  );

  return <div className={preserveOfficialForm ? "" : "app-theme"}>{children}</div>;
}
