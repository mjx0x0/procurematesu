"use client";

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface EndUserPageHeaderProps {
  titlePrimary: string;
  titleAccent: string;
  icon: LucideIcon;
  backHref?: string;
  containerClassName?: string;
  children?: ReactNode;
}

/** Compact page title bar. Navigation and account actions live in the shared sidebar. */
export function EndUserPageHeader({
  titlePrimary,
  titleAccent,
  icon: PageIcon,
  children,
}: EndUserPageHeaderProps) {
  return (
    <nav className="sticky top-0 z-40 h-[68px] shrink-0 border-b border-stone-200 bg-white/95 shadow-xs backdrop-blur-md sm:h-[72px]">
      <div className={`flex h-full w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8`}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="shrink-0 rounded-xl bg-[#4D002C] p-2 text-amber-300 shadow-sm">
            <PageIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <b className="block truncate text-lg font-black leading-tight text-[#4D002C] sm:text-xl">
              {titlePrimary} <span className="text-[#C27803]">{titleAccent}</span>
            </b>
          </div>
        </div>
        {children && <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">{children}</div>}
      </div>
    </nav>
  );
}
