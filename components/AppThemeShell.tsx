"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import SystemBranding from "@/components/SystemBranding";

const PRESERVE_PAGE_ROUTES = ["/", "/auth/signup", "/dashboard/pr-print"];

export default function AppThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Match the root route exactly; "/" must not act as a prefix for every page.
  const preserve = PRESERVE_PAGE_ROUTES.some((route) =>
    route === "/"
      ? pathname === "/"
      : route.endsWith("/")
        ? pathname.startsWith(route)
        : pathname === route
  );

  if (preserve) return <>{children}</>;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isChat = pathname === "/dashboard/chatbot";

  return (
    <div className={`app-theme ${isAdmin ? "admin-shell" : "portal-shell"} ${sidebarCollapsed ? "sidebar-is-collapsed" : "sidebar-is-expanded"}`}>
      <style>{`
        .portal-shell button[aria-label="Logout"]::after,
        .portal-shell button[title="Logout"]::after,
        .admin-shell button[aria-label="Logout"]::after,
        .admin-shell button[title="Logout"]::after,
        .app-sidebar button::after { content: none !important; display: none !important; }
      `}</style>
      <AppSidebar
        mode={isAdmin ? "admin" : "user"}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <div className={`app-theme-content ${isChat ? "mobile-chat-shell" : ""}`}>{children}</div>
      <SystemBranding />
    </div>
  );
}
