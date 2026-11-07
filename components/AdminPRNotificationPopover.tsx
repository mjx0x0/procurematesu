"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Check, Clock, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface AdminPRAlert {
  id: string;
  pr_no: string;
  department: string;
  purpose: string;
  total: number;
  created_at: string;
  is_read: boolean;
}

interface ToastAlert {
  pr_no: string;
  department: string;
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: number) {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Admin-only live alerts for newly inserted Purchase Requests.
 * Alerts are received through Supabase Realtime and are intentionally
 * separate from the end-user notifications table and workflow.
 */
export default function AdminPRNotificationPopover() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const seenPRsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminPRAlert[]>([]);
  const [toast, setToast] = useState<ToastAlert | null>(null);
  const [connection, setConnection] = useState<"checking" | "live" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const connect = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!cancelled) setConnection("offline");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role,status,is_active")
          .eq("id", user.id)
          .single();

        if (
          cancelled ||
          profileError ||
          profile?.role !== "admin" ||
          profile?.status !== "approved" ||
          profile?.is_active !== true
        ) {
          if (!cancelled) setConnection("offline");
          return;
        }

        channel = supabase
          .channel("admin-new-purchase-request-alerts")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "purchase_requests" },
            (payload) => {
              const row = payload.new as Record<string, unknown>;
              const prNo = typeof row.pr_no === "string" ? row.pr_no.trim() : "";

              // Do not notify an administrator about a request created by
              // the same account, or display duplicate Realtime deliveries.
              if (!prNo || row.user_id === user.id || seenPRsRef.current.has(prNo)) return;

              seenPRsRef.current.add(prNo);

              const createdAt =
                typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
              const notification: AdminPRAlert = {
                id: prNo,
                pr_no: prNo,
                department: typeof row.department === "string" ? row.department : "Department not specified",
                purpose: typeof row.purpose === "string" ? row.purpose : "No purpose provided",
                total: Number.isFinite(Number(row.total)) ? Number(row.total) : 0,
                created_at: createdAt,
                is_read: false,
              };

              setItems((current) => [notification, ...current.filter((item) => item.pr_no !== prNo)].slice(0, 10));
              setToast({ pr_no: prNo, department: notification.department });

              if (toastTimerRef.current !== null) {
                window.clearTimeout(toastTimerRef.current);
              }
              toastTimerRef.current = window.setTimeout(() => setToast(null), 6500);
            }
          )
          .subscribe((status) => {
            if (cancelled) return;
            setConnection(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "checking");
          });
      } catch (error) {
        console.error("Unable to connect admin PR notifications:", error);
        if (!cancelled) setConnection("offline");
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unread = items.filter((item) => !item.is_read).length;

  const markAllRead = () => {
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  };

  const openPurchaseRequests = () => {
    setOpen(false);
    setToast(null);
    router.push("/admin/purchase-requests");
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`New Purchase Request notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F6D58A]/70 active:scale-95 ${
          open
            ? "border-[#F6D58A]/50 bg-white/15 text-[#F6D58A]"
            : "border-white/20 bg-white/[0.09] text-white/90 hover:border-[#F6D58A]/45 hover:bg-white/15 hover:text-[#F6D58A]"
        }`}
        title="New Purchase Request notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F6C453] px-1 text-[9px] font-black text-[#4A002A] ring-2 ring-[#4A002A]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {connection === "live" && (
          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-[#4A002A]" />
        )}
      </button>

      {toast && !open && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-3 right-3 top-[66px] z-[80] mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-amber-200 bg-white p-3 shadow-[0_12px_34px_rgba(45,0,26,0.2)] sm:left-auto sm:right-5 sm:top-[82px]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <BellRing className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-[#4D002C]">New Purchase Request received</p>
            <p className="mt-0.5 break-words text-[11px] text-stone-600">
              {toast.pr_no} · {toast.department}
            </p>
            <button
              type="button"
              onClick={openPurchaseRequests}
              className="mt-1 text-[11px] font-bold text-[#7B0046] underline underline-offset-2"
            >
              Open Purchase Requests
            </button>
          </div>
        </div>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[65] cursor-default bg-stone-900/20 backdrop-blur-[1px] sm:hidden"
          />
          <section
            role="dialog"
            aria-label="New Purchase Request notifications"
            className="fixed left-3 right-3 top-[66px] z-[70] mx-auto max-h-[min(480px,calc(100svh-84px))] w-auto max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_50px_rgba(45,0,26,0.2)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[390px] sm:max-w-[calc(100vw-2rem)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-[#FAF8F5] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7B0046]/10 text-[#7B0046]">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-[#4D002C]">New PR Notifications</h2>
                    {unread > 0 && (
                      <span className="rounded-full bg-[#7B0046] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        {unread} new
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-stone-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${connection === "live" ? "bg-emerald-500" : connection === "offline" ? "bg-red-400" : "bg-amber-400"}`} />
                    {connection === "live" ? "Live updates enabled" : connection === "offline" ? "Live updates unavailable" : "Connecting to live updates…"}
                  </p>
                </div>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-[#7B0046] transition hover:bg-[#FDF2F7]"
                >
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Mark viewed
                  </span>
                </button>
              )}
            </div>

            <div className="max-h-[min(390px,calc(100svh-160px))] divide-y divide-stone-100 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                    <FileText className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-xs font-bold text-stone-800">No new Purchase Requests</p>
                  <p className="mx-auto mt-1 max-w-[250px] text-[11px] leading-relaxed text-stone-500">
                    Newly created requests from personnel will appear here while the admin dashboard is open.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
                      openPurchaseRequests();
                    }}
                    className={`block w-full p-3.5 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7B0046] ${
                      item.is_read ? "bg-white" : "bg-[#FFFDF7]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#7B0046]/15 bg-[#FDF2F7] text-[#7B0046]">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="break-all font-mono text-xs font-extrabold text-[#4D002C]">{item.pr_no}</span>
                          {!item.is_read && (
                            <span className="shrink-0 rounded-full bg-[#7B0046] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block break-words text-[11px] font-semibold text-stone-700">{item.department}</span>
                        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-stone-500">{item.purpose}</span>
                        <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.created_at)}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-[#7B0046]">₱{formatMoney(item.total)}</span>
                        </span>
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-stone-100 bg-stone-50/70 p-2.5">
              <button
                type="button"
                onClick={openPurchaseRequests}
                className="flex min-h-9 w-full items-center justify-center rounded-lg bg-[#7B0046] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#610037]"
              >
                Open Purchase Requests
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
