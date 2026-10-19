"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, LogOut, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";
import { supabase } from "@/lib/supabase/client";

interface SystemPageHeaderProps {
  titlePrimary: string;
  titleAccent: string;
  icon?: LucideIcon;
  backHref?: string | null;
  containerClassName?: string;
  workspaceLabel?: string;
  brandLogo?: boolean;
  roleLabel?: string;
  showAdminPortal?: boolean;
  compactOnMobile?: boolean;
  mobileTitlePrimary?: string;
  mobileTitleAccent?: string;
  children?: ReactNode;
}

export function SystemPageHeader({
  titlePrimary,
  titleAccent,
  icon: PageIcon,
  backHref = "/dashboard",
  containerClassName = "max-w-7xl px-4 sm:px-6 lg:px-8",
  workspaceLabel,
  brandLogo = false,
  roleLabel = "End User",
  showAdminPortal = false,
  compactOnMobile = false,
  mobileTitlePrimary,
  mobileTitleAccent,
  children,
}: SystemPageHeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
        }
        if (!cancelled) setCurrentUser(user);
      } catch (error) {
        console.error("Unable to load account for system header:", error);
      }
    };
    void loadUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "Signed-in user";

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Logout failed:", error);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      router.replace("/");
    }
  };

  return (
    <nav data-compact-mobile={compactOnMobile ? "true" : undefined} className={compactOnMobile ? "sticky top-0 z-50 h-14 chatbot-mobile-header shrink-0 border-b border-stone-200 bg-white/95 shadow-xs backdrop-blur-md sm:h-[68px]" : "sticky top-0 z-50 h-16 shrink-0 border-b border-stone-200 bg-white/95 shadow-xs backdrop-blur-md sm:h-[68px]"}>
      <div className={`mx-auto flex h-full items-center justify-between ${compactOnMobile ? "gap-1 sm:gap-3" : "gap-3"} ${containerClassName}`}>
        <div className={`flex min-w-0 items-center ${compactOnMobile ? "gap-1.5 sm:gap-3" : "gap-2 sm:gap-3"}`}>
          {backHref !== null && (
            <Link href={backHref} className={compactOnMobile ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#7B0046] focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20" : "flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#7B0046] focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20"} title="Back" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          {brandLogo ? (
            <MsuLogo size={36} className="shrink-0" />
          ) : (
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4D002C] text-amber-300 shadow-sm ${compactOnMobile ? "hidden sm:flex" : ""}`}>
              {PageIcon && <PageIcon className="h-5 w-5" />}
            </div>
          )}
          <div className="min-w-0">
            <b className={`block truncate ${compactOnMobile ? "text-sm sm:text-xl" : "text-lg sm:text-xl"} font-black leading-tight tracking-tight text-[#4D002C]`}>
              {compactOnMobile && (
                <span className="sm:hidden">
                  {mobileTitlePrimary ?? titlePrimary} <span className="text-[#F5AB26]">{mobileTitleAccent ?? titleAccent}</span>
                </span>
              )}
              <span className={compactOnMobile ? "hidden sm:inline" : ""}>
                {titlePrimary} <span className="text-[#F5AB26]">{titleAccent}</span>
              </span>
            </b>
            {workspaceLabel && <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#F5AB26]">{workspaceLabel}</p>}
          </div>
        </div>
        <div className={`flex shrink-0 items-center justify-end ${compactOnMobile ? "gap-1 sm:gap-3" : "gap-2 sm:gap-3"}`}>
          {children && <div className={`flex shrink-0 items-center ${compactOnMobile ? "gap-1 sm:gap-3" : "gap-2 sm:gap-3"}`}>{children}</div>}
          <div ref={accountMenuRef} className="relative shrink-0">
            <button type="button" onClick={() => setAccountMenuOpen((previous) => !previous)} className={compactOnMobile ? "flex h-10 max-w-[48vw] cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-1.5 text-xs text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20 sm:max-w-[250px] sm:gap-2 sm:px-3" : "flex h-11 sm:h-10 max-w-[48vw] cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-2.5 text-xs text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20 sm:max-w-[250px] sm:px-3"} aria-expanded={accountMenuOpen} aria-label="User account menu">
              <div className={`flex ${compactOnMobile ? "h-6 w-6 sm:h-7 sm:w-7" : "h-7 w-7"} shrink-0 items-center justify-center rounded-full bg-[#7B0046]/10 text-[#7B0046]`}>
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden max-w-[170px] truncate text-xs font-medium text-stone-800 sm:inline">{displayName}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${accountMenuOpen ? "rotate-180 text-[#7B0046]" : ""}`} />
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(45,25,20,0.12)]">
                <div className="border-b border-stone-100 px-3 py-2.5">
                  <p className="truncate text-xs font-bold text-stone-900">{displayName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-stone-500">{currentUser?.email || "Signed-in user"}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-[#F5D6E5] bg-[#FDF2F7] px-2 py-0.5 text-[9px] font-bold text-[#7B0046]">{roleLabel}</span>
                  </div>
                </div>
                {showAdminPortal && (
                  <Link href="/admin" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-[#7B0046]">
                    <ShieldCheck className="h-4 w-4 text-[#F5AB26]" />
                    <span>Admin Portal</span>
                  </Link>
                )}
                <button type="button" onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
