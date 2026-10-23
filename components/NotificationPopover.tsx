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

export function NotificationPopover() {
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
        className={`relative flex h-10 w-10 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded-xl border transition active:scale-95 ${
          open
            ? "border-[#7B0046]/30 bg-[#FDF2F7] text-[#7B0046]"
            : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-[#7B0046]"
        }`}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7B0046] px-1 text-[10px] font-black text-white shadow-xs ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <>
          {/* Mobile backdrop to dismiss cleanly */}
          <div
            className="fixed inset-0 z-[65] bg-stone-900/20 backdrop-blur-[1px] sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            className="fixed left-3 right-3 top-[68px] z-[70] mx-auto max-w-sm overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_20px_50px_rgba(45,0,26,0.18),0_4px_16px_rgba(0,0,0,0.08)] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[380px] sm:max-w-none sm:mx-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 bg-[#FAF8F5] px-4 py-3 sm:px-4.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B0046]/10 text-[#7B0046]">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-[#4D002C]">
                      Notifications
                    </h3>
                    {unread > 0 && (
                      <span className="rounded-full bg-[#7B0046] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        {unread} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-500 font-medium">
                    Procurement updates &amp; remarks
                  </p>
                </div>
              </div>

              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#7B0046] transition hover:bg-[#FDF2F7] active:scale-95"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[min(420px,calc(100svh-170px))] overflow-y-auto divide-y divide-stone-100">
              {loading && items.length === 0 ? (
                <div className="px-5 py-12 text-center text-xs text-stone-400">
                  <div className="mx-auto mb-2.5 h-5 w-5 animate-spin rounded-full border-2 border-[#7B0046] border-t-transparent" />
                  Loading notifications…
                </div>
              ) : error ? (
                <div className="px-5 py-10 text-center">
                  <Bell className="mx-auto h-8 w-8 text-stone-300" />
                  <p className="mt-2 text-xs font-bold text-stone-700">
                    Notifications unavailable
                  </p>
                  <button
                    type="button"
                    onClick={load}
                    className="mt-2 text-xs font-bold text-[#7B0046] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="px-5 py-11 text-center">
                  <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-stone-800">
                    No notifications yet
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-500 max-w-[220px] mx-auto">
                    New procurement updates, status changes, and remarks will appear here.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 transition-colors ${
                      item.is_read
                        ? "bg-white hover:bg-stone-50/70"
                        : "bg-[#FFFDF7] hover:bg-[#FFF9EE]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                          item.type === "rejected"
                            ? "border-red-200 bg-red-50 text-red-600"
                            : item.type === "remark"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-[#7B0046]/15 bg-[#FDF2F7] text-[#7B0046]"
                        }`}
                      >
                        {iconFor(item.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-stone-900 leading-snug">
                            {item.title}
                          </h4>
                          {!item.is_read && (
                            <span className="shrink-0 rounded-full bg-[#7B0046] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                              New
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-[11px] leading-relaxed text-stone-600 break-words">
                          {item.message}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 font-medium">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(item.created_at)}
                          </span>

                          <div className="flex items-center gap-2">
                            {item.pr_no && (
                              <Link
                                href={`/dashboard/pr/${item.pr_no}`}
                                onClick={() => {
                                  if (!item.is_read) markRead(item.id);
                                  setOpen(false);
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-[#7B0046]/10 px-2 py-0.5 text-[11px] font-bold text-[#7B0046] transition hover:bg-[#7B0046] hover:text-white"
                              >
                                <span>View PR</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}

                            {!item.is_read && (
                              <button
                                type="button"
                                onClick={() => markRead(item.id)}
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                              >
                                <Check className="h-3 w-3" />
                                <span>Read</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
