"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MsuLogo } from "@/components/msu-logo";
import { BarChart3, Bot, FilePlus2, MessageSquare, ShieldCheck, Users, ClipboardCheck } from "lucide-react";

interface AppSidebarProps {
  mode: "user" | "admin";
}

interface SidebarItem {
  href: string;
  label: string;
  icon: typeof BarChart3;
  badge?: string;
}

const userItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/chatbot", label: "Gab AI", icon: Bot, badge: "AI" },
  { href: "/dashboard/transparency", label: "Transparency", icon: ShieldCheck },
  { href: "/dashboard/new-pr", label: "Create Purchase Request", icon: FilePlus2 },
];

const adminItems: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "User Approvals", icon: Users },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/rfq", label: "RFQ Workspace", icon: ClipboardCheck },
];

export default function AppSidebar({ mode }: AppSidebarProps) {
  const pathname = usePathname() || "";
  const items = mode === "admin" ? adminItems : userItems;

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-[55] hidden w-[230px] flex-col bg-gradient-to-b from-[#4A002A] via-[#6B003E] to-[#3D0024] text-white shadow-[10px_0_30px_rgba(40,0,24,0.18)] border-r border-[#F5AB26]/20 lg:flex">
      <div className="flex h-[72px] items-center gap-3 border-b border-[#F5AB26]/15 px-5 bg-black/10">
        <MsuLogo size={38} className="shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold tracking-tight text-white">MSU GenSan</p>
          <p className="text-[10px] font-black tracking-wider text-[#F0C83F] uppercase">Procurement System</p>
        </div>
      </div>

      <div className="px-5 pt-6 pb-2">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/60">
          {mode === "admin" ? "Admin Controls" : "Main Navigation"}
        </p>
      </div>

      <nav className="mt-1 flex-1 space-y-1.5 px-3">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = href === (mode === "admin" ? "/admin" : "/dashboard")
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-xs font-bold transition-all ${
                active
                  ? "bg-gradient-to-r from-[#8E0052] to-[#7B0046] text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] border border-[#F0C83F]/30"
                  : "text-white/80 hover:bg-white/[0.08] hover:text-white hover:border-white/10"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-[#F0C83F]" : "text-white/60 group-hover:text-amber-300"}`} />
              <span className="truncate">{label}</span>
              {badge && (
                <span className="ml-auto rounded-md bg-[#F0C83F] px-1.5 py-0.5 text-[9px] font-black text-[#4D002C] shadow-xs">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
