"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  MessageSquareText,
  XCircle,
} from "lucide-react";

interface Notification {
  id: string;
  pr_no: string | null;
  type: "info" | "update" | "remark" | "rejected";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function NotificationPopover({ variant = "default" }: { variant?: "default" | "workspace" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(false);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        setItems([]);
        return;
      }
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("id,pr_no,type,title,message,is_read,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);
      if (queryError) {
        console.warn("Notification load failed:", queryError.message);
        setError(true);
        return;
      }
      setItems((data || []) as Notification[]);
    } catch (err) {
      console.warn("Notification load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications initially on mount & set up interval
  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, []);

  // Reload when opened
  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  // Handle clicking outside to dismiss
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unread = items.filter((i) => !i.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((current) =>
      current.map((i) => (i.id === id ? { ...i, is_read: true } : i))
    );
  };

  const markAll = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid || !unread) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", uid)
      .eq("is_read", false);
    setItems((current) => current.map((i) => ({ ...i, is_read: true })));
  };

  const iconFor = (type: Notification["type"]) => {
    switch (type) {
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "remark":
        return <MessageSquareText className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-10 w-10 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded-xl border transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F6D58A]/60 ${
          variant === "workspace"
            ? open
              ? "border-[#F6D58A]/50 bg-white/15 text-[#F6D58A]"
              : "border-white/20 bg-white/[0.09] text-white/90 hover:border-[#F6D58A]/45 hover:bg-white/15 hover:text-[#F6D58A]"
            : open
              ? "border-[#7B0046]/30 bg-[#FDF2F7] text-[#7B0046]"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-[#7B0046]"
        }`}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black shadow-xs ring-2 ${variant === "workspace" ? "bg-[#F6C453] text-[#4A002A] ring-[#4A002A]" : "bg-[#7B0046] text-white ring-white"}`}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[65] cursor-default bg-stone-950/20 backdrop-blur-[2px] sm:hidden"
          />
          <section
            role="dialog"
            aria-label="Notification center"
            className="fixed left-3 right-3 top-[68px] z-[70] mx-auto flex max-h-[min(620px,calc(100svh-84px))] w-auto max-w-md flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_22px_60px_rgba(45,0,26,0.2)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[400px] sm:max-w-[calc(100vw-2rem)]"
          >
            <div className="border-b border-stone-100 bg-white px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7B0046]/[0.07] text-[#7B0046]">
                    <Bell className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-[15px] font-extrabold leading-tight text-[#4D002C]">Notifications</h3>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-stone-600">
                        {items.length} total
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500">Procurement updates and remarks</p>
                  </div>
                </div>
                {unread > 0 && (
                  <span className="shrink-0 rounded-full bg-[#7B0046] px-2.5 py-1 text-[10px] font-bold text-white">
                    {unread} unread
                  </span>
                )}
              </div>
              {unread > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={markAll}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold text-[#7B0046] transition hover:bg-[#FDF2F7] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all as read
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto overscroll-contain">
              {loading && items.length === 0 ? (
                <div className="px-5 py-12 text-center text-xs text-stone-500">
                  <div className="mx-auto mb-2.5 h-5 w-5 animate-spin rounded-full border-2 border-[#7B0046] border-t-transparent" />
                  Loading notifications…
                </div>
              ) : error ? (
                <div className="px-5 py-10 text-center">
                  <Bell className="mx-auto h-8 w-8 text-stone-300" />
                  <p className="mt-2 text-xs font-bold text-stone-700">Notifications unavailable</p>
                  <button type="button" onClick={load} className="mt-2 text-xs font-bold text-[#7B0046] hover:underline">Try again</button>
                </div>
              ) : items.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                    <Bell className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-xs font-bold text-stone-800">You’re all caught up</p>
                  <p className="mx-auto mt-1 max-w-[240px] text-[11px] leading-relaxed text-stone-500">
                    New procurement updates, status changes, and remarks will appear here.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <article
                    key={item.id}
                    className={`px-4 py-3.5 transition-colors sm:px-5 ${
                      item.is_read ? "bg-white hover:bg-stone-50/70" : "bg-[#FFFCF7] hover:bg-[#FFF9EF]"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        item.type === "rejected"
                          ? "border-red-200 bg-red-50 text-red-600"
                          : item.type === "remark"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-[#7B0046]/10 bg-[#7B0046]/[0.055] text-[#7B0046]"
                      }`}>
                        {iconFor(item.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[12px] font-bold leading-snug text-[#4D002C]">{item.title}</h4>
                          {!item.is_read && (
                            <span className="shrink-0 rounded-full bg-[#7B0046] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">New</span>
                          )}
                        </div>
                        <p className="mt-1 break-words text-[11px] leading-[1.55] text-stone-600">{item.message}</p>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(item.created_at)}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {item.pr_no && (
                              <Link
                                href={`/dashboard/pr/${encodeURIComponent(item.pr_no)}`}
                                onClick={() => {
                                  if (!item.is_read) void markRead(item.id);
                                  setOpen(false);
                                }}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#7B0046]/[0.07] px-2.5 text-[10px] font-bold text-[#7B0046] transition hover:bg-[#7B0046] hover:text-white"
                              >
                                <span>View PR</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                            {!item.is_read && (
                              <button
                                type="button"
                                onClick={() => void markRead(item.id)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-[10px] font-semibold text-stone-600 transition hover:border-[#7B0046]/25 hover:bg-[#FDF2F7] hover:text-[#7B0046]"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="border-t border-stone-100 bg-stone-50/80 px-4 py-2.5 text-center">
              <p className="text-[10px] text-stone-500">Your procurement notifications are saved to your account.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
