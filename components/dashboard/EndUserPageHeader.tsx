"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, LogOut, User, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface EndUserPageHeaderProps {
  titlePrimary: string;
  titleAccent: string;
  icon: LucideIcon;
  backHref?: string;
  containerClassName?: string;
  children?: ReactNode;
}

export function EndUserPageHeader({
  titlePrimary,
  titleAccent,
  icon: PageIcon,
  backHref = "/dashboard",
  containerClassName = "max-w-7xl px-4 sm:px-6",
  children,
}: EndUserPageHeaderProps) {
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
        console.warn("Unable to load end-user account for page header:", error);
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
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
    "End User";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("End-user logout failed:", error);
    } finally {
      router.replace("/");
    }
  };

  return (
    <nav className="sticky top-0 z-40 shrink-0 border-b border-stone-200 bg-white/95 shadow-xs backdrop-blur-md">
      <div className={`mx-auto flex items-center justify-between gap-3 py-3.5 ${containerClassName}`}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href={backHref}
            className="shrink-0 rounded-xl p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#7B0046]"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="shrink-0 rounded-xl bg-[#4D002C] p-2 text-amber-300 shadow-sm">
            <PageIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <b className="block truncate text-lg font-black leading-tight text-[#4D002C] sm:text-xl">
              {titlePrimary} <span className="text-[#F5AB26]">{titleAccent}</span>
            </b>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          {children}

          <div ref={accountMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="flex max-w-[48vw] cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20 sm:max-w-[250px] sm:px-3"
              aria-expanded={accountMenuOpen}
              aria-label="User account menu"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7B0046]/10 text-[#7B0046]">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden max-w-[170px] truncate text-xs font-medium text-stone-800 sm:inline">
                {displayName}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${accountMenuOpen ? "rotate-180 text-[#7B0046]" : ""}`}
              />
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(45,25,20,0.12)]">
                <div className="border-b border-stone-100 px-3 py-2.5">
                  <p className="truncate text-xs font-bold text-stone-900">{displayName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-stone-500">
                    {currentUser?.email || "Signed-in user"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-red-200/60 bg-red-50 px-2 py-0.5 text-[9px] font-bold text-[#7B0046]">
                      End User
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
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
