"use client";

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";

interface SystemPageHeaderProps {
  titlePrimary?: string;
  titleAccent?: string;
  icon?: LucideIcon;
  backHref?: string | null;
  showAdminPortal?: boolean;
  containerClassName?: string;
  workspaceLabel?: string;
  subtitle?: string;
  headerTitle?: string;
  hideSystemSuffix?: boolean;
  brandLogo?: boolean;
  brandWordmark?: boolean;
  roleLabel?: string;
  compactOnMobile?: boolean;
  mobileTitlePrimary?: string;
  mobileTitleAccent?: string;
  children?: ReactNode;
  showControlsDivider?: boolean;
}

export function SystemPageHeader({
  titlePrimary,
  titleAccent,
  icon: PageIcon,
  workspaceLabel,
  subtitle,
  headerTitle,
  hideSystemSuffix = false,
  brandLogo = true,
  brandWordmark = true,
  roleLabel = "End User",
  compactOnMobile = false,
  mobileTitlePrimary,
  mobileTitleAccent,
  children,
}: SystemPageHeaderProps) {
  const effectiveWorkspaceLabel =
    subtitle ||
    workspaceLabel ||
    (roleLabel === "Administrator" ? "Administrative Workspace" : "End User Workspace");

  return (
    <nav
      data-compact-mobile={compactOnMobile ? "true" : undefined}
      data-workspace-brand={brandLogo && brandWordmark ? "true" : undefined}
      className={
        brandLogo && brandWordmark
          ? compactOnMobile
            ? "sticky top-0 z-50 h-[68px] chatbot-mobile-header shrink-0 border-b border-[#F5AB26]/25 bg-[#4A002A]/95 shadow-[0_4px_24px_rgba(30,0,18,0.22)] backdrop-blur-md sm:h-[72px]"
            : "sticky top-0 z-50 h-[68px] shrink-0 border-b border-[#F5AB26]/25 bg-[#4A002A]/95 shadow-[0_4px_24px_rgba(30,0,18,0.22)] backdrop-blur-md sm:h-[72px]"
          : compactOnMobile
            ? "sticky top-0 z-50 h-[68px] chatbot-mobile-header shrink-0 border-b border-stone-200 bg-white/95 shadow-xs backdrop-blur-md sm:h-[72px]"
            : "sticky top-0 z-50 h-[68px] shrink-0 border-b border-stone-200 bg-white/95 shadow-xs backdrop-blur-md sm:h-[72px]"
      }
    >
      <div className={`flex h-full w-full items-center justify-between gap-3 px-4 pl-14 sm:px-6 sm:pl-6 lg:px-8`}>
        <div className={`flex min-w-0 items-center gap-3`}>
          {brandLogo ? (
            brandWordmark ? (
              <MsuLogo size={38} className="shrink-0" />
            ) : (
              <MsuLogo size={36} className="shrink-0" />
            )
          ) : PageIcon ? (
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4D002C] text-amber-300 shadow-sm ${compactOnMobile ? "hidden sm:flex" : ""}`}>
              <PageIcon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0">
            <b
              aria-label={brandWordmark ? "ProcureMSU" : undefined}
              className={`block truncate font-[750] leading-tight ${brandWordmark ? "text-[18px] tracking-[-0.04em] sm:text-[20px]" : `${compactOnMobile ? "text-sm sm:text-xl" : "text-lg sm:text-xl"} tracking-tight text-[#4D002C]`}`}
            >
              {headerTitle ? (
                <span className="flex items-center whitespace-nowrap">
                  <span className="bg-gradient-to-r from-white via-[#FFF5E5] to-[#F1E4EF] bg-clip-text text-transparent">
                    {headerTitle.split(" ")[0]}
                  </span>
                  {headerTitle.split(" ").slice(1).length > 0 && (
                    <span className="ml-1.5 bg-gradient-to-br from-[#FFF0B5] via-[#F6C453] to-[#C9871B] bg-clip-text text-transparent">
                      {headerTitle.split(" ").slice(1).join(" ")}
                    </span>
                  )}
                </span>
              ) : brandWordmark ? (
                <span className="flex items-center whitespace-nowrap">
                  <span className="bg-gradient-to-r from-white via-[#FFF5E5] to-[#F1E4EF] bg-clip-text text-transparent">Procure</span><span className="bg-gradient-to-br from-[#FFF0B5] via-[#F6C453] to-[#C9871B] bg-clip-text text-transparent">M</span><span className="bg-gradient-to-br from-[#FFF0B5] via-[#F6C453] to-[#C9871B] bg-clip-text text-transparent">SU</span>
                </span>
              ) : (
                <>
                  {compactOnMobile && (
                    <span className="sm:hidden">
                      {mobileTitlePrimary ?? titlePrimary} <span className="text-[#C27803]">{mobileTitleAccent ?? titleAccent}</span>
                    </span>
                  )}
                  <span className={compactOnMobile ? "hidden sm:inline" : ""}>
                    {titlePrimary} <span className="text-[#C27803]">{titleAccent}</span>
                  </span>
                </>
              )}
            </b>
            {headerTitle === "GAB AI" || headerTitle === "Gab AI" || hideSystemSuffix ? (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[7.5px] font-bold uppercase tracking-[0.10em] sm:text-[8.5px] sm:tracking-[0.13em]">
                <span className="shrink-0 text-[#F6D58A]">{effectiveWorkspaceLabel || "Procurement Assistant"}</span>
              </p>
            ) : brandWordmark ? (
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[7px] font-bold uppercase tracking-[0.10em] sm:text-[8.5px] sm:tracking-[0.13em]">
                <span className="shrink-0 text-[#F6D58A]">MSU – General Santos</span>
                <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[#E9B957]" />
                <span className="truncate text-white/75">Digital Procurement Logbook</span>
                <span className="sr-only">Digital Procurement System</span>
              </p>
            ) : (
              <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] bg-gradient-to-br from-[#A16207] via-[#D97706] to-[#B45309] bg-clip-text text-transparent">
                {effectiveWorkspaceLabel}
              </p>
            )}
          </div>
        </div>
        <div className={`flex shrink-0 items-center justify-end gap-2 sm:gap-3`}>
          {children && <div className={`flex shrink-0 items-center gap-2 sm:gap-3`}>{children}</div>}


        </div>
      </div>
    </nav>
  );
}
