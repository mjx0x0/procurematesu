"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  BarChart3, Bot, FilePlus2, FileText, MessageSquare, ShieldCheck, Users, User, ChevronDown, LogOut,
  PanelLeftClose, PanelLeftOpen, Menu, X, ClipboardList, ChartNoAxesCombined,
} from "lucide-react";

interface AppSidebarProps {
  mode: "user" | "admin";
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

interface SidebarItem {
  href: string;
  label: string;
  icon: typeof BarChart3;
}

const userItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/new-pr", label: "Create Purchase Request", icon: FilePlus2 },
  { href: "/dashboard/purchase-requests", label: "My Purchase Requests", icon: FileText },
  { href: "/dashboard/chatbot", label: "GAB AI", icon: Bot },
  { href: "/dashboard/transparency", label: "Transparency Board", icon: ShieldCheck },
];

const adminItems: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/purchase-requests", label: "Purchase Requests / Logbook", icon: ClipboardList },
  { href: "/admin/users", label: "User Approvals", icon: Users },
  { href: "/admin/inquiries", label: "Inquiry Logs", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports & Analytics", icon: ChartNoAxesCombined },
];

export default function AppSidebar({ mode, collapsed, onToggleCollapsed }: AppSidebarProps) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  useEffect(() => { let cancelled = false; supabase.auth.getUser().then(({ data: { user } }) => { if (!cancelled) setCurrentUser(user); }); return () => { cancelled = true; }; }, []);
  const displayName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email?.split("@")[0] || "Signed-in user";
  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/"); };
  const items = mode === "admin" ? adminItems : userItems;
  const rootHref = mode === "admin" ? "/admin" : "/dashboard";
  const navLabel = mode === "admin" ? "Admin navigation" : "Main navigation";

  const isActive = (href: string) => href === rootHref
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  const links = (mobile = false) => items.map(({ href, label, icon: Icon }) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => mobile && setMobileOpen(false)}
        aria-current={active ? "page" : undefined}
        title={collapsed && !mobile ? label : undefined}
        className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5AB26] ${active
          ? "bg-white/15 text-white ring-1 ring-inset ring-[#F5AB26]/35 shadow-sm"
          : "text-white/75 hover:bg-white/10 hover:text-white"} ${collapsed && !mobile ? "justify-center px-2" : ""}`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#F5AB26]" : "text-white/65 group-hover:text-[#F5AB26]"}`} aria-hidden="true" />
        {(!collapsed || mobile) && <span className="min-w-0 flex-1 truncate">{label}</span>}
        {active && (!collapsed || mobile) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5AB26]" />}
      </Link>
    );
  });

  return (
    <>
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-[80] hidden flex-col border-r border-[#F5AB26]/20 bg-gradient-to-b from-[#4A002A] via-[#650039] to-[#3D0024] text-white shadow-[10px_0_30px_rgba(40,0,24,0.18)] transition-[width] duration-200 lg:flex ${collapsed ? "w-[76px]" : "w-[250px]"}`}>
        <div className={`flex items-center pt-[92px] pb-2 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
          {!collapsed && <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/60">{mode === "admin" ? "Admin Workspace" : "Main Navigation"}</p>}
          <button type="button" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/65 transition hover:bg-white/10 hover:text-[#F5AB26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5AB26]">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav aria-label={navLabel} className={`mt-1 flex-1 space-y-1 overflow-y-auto pb-4 ${collapsed ? "px-2" : "px-3"}`}>
          {links()}
        </nav>

        <div className="mt-auto border-t border-white/10 p-3">
          <button type="button" onClick={() => setAccountOpen((v) => !v)} aria-expanded={accountOpen} aria-label="User account menu" title={displayName} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5AB26] ${collapsed ? "justify-center" : ""}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6D58A]/15 text-[#F6D58A]"><User className="h-4 w-4" /></span>
            {!collapsed && <><span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{displayName}</span><ChevronDown className={`h-3.5 w-3.5 text-white/60 transition-transform ${accountOpen ? "rotate-180" : ""}`} /></>}
          </button>
          {accountOpen && <div className={`mt-2 rounded-xl border border-white/10 bg-[#390020] p-1.5 ${collapsed ? "absolute bottom-16 left-[76px] w-56" : ""}`}>
            {!collapsed && <div className="border-b border-white/10 px-2.5 py-2"><p className="truncate text-xs font-bold text-white">{displayName}</p><p className="truncate text-[10px] text-white/55">{currentUser?.email || "Signed-in user"}</p></div>}
            <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/15"><LogOut className="h-4 w-4" />Logout</button>
          </div>}
        </div>
      </aside>

      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" className="fixed left-3 top-[82px] z-[75] flex h-10 w-10 items-center justify-center rounded-xl border border-[#F5AB26]/30 bg-[#5B0035] text-white shadow-lg lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-[#1B1018]/60 backdrop-blur-[2px]" />
          <aside className="relative flex h-full w-[min(84vw,300px)] flex-col bg-gradient-to-b from-[#4A002A] via-[#650039] to-[#3D0024] text-white shadow-2xl">
            <div className="flex h-[72px] shrink-0 items-center justify-end border-b border-[#F5AB26]/20 px-4"><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></div>
            <p className="px-5 pt-6 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/60">{mode === "admin" ? "Admin Workspace" : "Main Navigation"}</p>
            <nav aria-label={navLabel} className="flex-1 space-y-1 overflow-y-auto px-3">{links(true)}</nav>
            <div className="mt-auto border-t border-white/10 p-3">
              <button type="button" onClick={() => setAccountOpen((v) => !v)} aria-expanded={accountOpen} aria-label="User account menu" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left transition hover:bg-white/10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6D58A]/15 text-[#F6D58A]"><User className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{displayName}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-white/60 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
              </button>
              {accountOpen && <div className="mt-2 rounded-xl border border-white/10 bg-[#390020] p-1.5">
                <div className="border-b border-white/10 px-2.5 py-2"><p className="truncate text-xs font-bold text-white">{displayName}</p><p className="truncate text-[10px] text-white/55">{currentUser?.email || "Signed-in user"}</p></div>
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/15"><LogOut className="h-4 w-4" />Logout</button>
              </div>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
