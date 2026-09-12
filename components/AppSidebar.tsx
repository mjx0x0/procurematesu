"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { BarChart3, Bot, FilePlus2, FileText, LogOut, MessageSquare, ShieldCheck, Users, ClipboardCheck } from "lucide-react";

interface AppSidebarProps {
  mode: "user" | "admin";
}

const userItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/chatbot", label: "Ask Gab AI", icon: Bot, badge: "AI" },
  { href: "/dashboard/transparency", label: "Transparency", icon: ShieldCheck },
  { href: "/dashboard/new-pr", label: "Create Purchase Request", icon: FilePlus2 },
];

const adminItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "User Approvals", icon: Users },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/rfq", label: "RFQ Workspace", icon: ClipboardCheck },
];

export default function AppSidebar({ mode }: AppSidebarProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const items = mode === "admin" ? adminItems : userItems;

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-[55] hidden w-[171px] flex-col bg-gradient-to-b from-[#620A0C] via-[#760D10] to-[#4D080A] text-white shadow-[8px_0_28px_rgba(53,7,8,.12)] lg:flex">
      <div className="flex h-[66px] items-center gap-2.5 border-b border-amber-300/15 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300/10 text-[#E5C34E] border border-amber-300/20">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-extrabold">MSU GenSan</p>
          <p className="text-[9px] font-bold text-[#E5C34E]">PROCUREMENT PORTAL</p>
        </div>
      </div>

      <div className="px-3 pt-5">
        <p className="px-2 text-[8px] font-extrabold uppercase tracking-[.13em] text-amber-200/55">Portal Menu</p>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-2.5">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = href === (mode === "admin" ? "/admin" : "/dashboard")
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-[10px] font-semibold transition-all ${
                active
                  ? "bg-[#B10814] text-white shadow-[0_5px_16px_rgba(0,0,0,.15)] ring-1 ring-amber-300/15"
                  : "text-white/75 hover:bg-white/[.07] hover:text-white"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-amber-300" : "text-white/55 group-hover:text-amber-200"}`} />
              <span className="truncate">{label}</span>
              {badge && <span className="ml-auto rounded bg-amber-300 px-1 text-[7px] font-black text-[#5A090B]">{badge}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2.5">
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-semibold text-white/65 hover:bg-white/[.07] hover:text-white">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
