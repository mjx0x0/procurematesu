"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Bell, BellRing, CheckCheck, Clock, FileText, Hash, Mail, MailOpen, Trash2, UserRoundPlus } from "lucide-react";

const ADMIN_NOTIFICATION_TYPES = [
  "pr_created",
  "user_registered",
  "pr_stage_changed",
  "pr_number_assigned",
] as const;

interface AdminNotification {
  id: string;
  user_id: string;
  pr_no: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDestination(item: AdminNotification) {
  if (item.type === "user_registered") return "/admin/users";
  if (item.pr_no) return "/admin/purchase-requests?search=" + encodeURIComponent(item.pr_no);
  return "/admin/purchase-requests";
}

function getIcon(type: string) {
  if (type === "user_registered") return <UserRoundPlus className="h-4 w-4" />;
  if (type === "pr_number_assigned") return <Hash className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export default function AdminPRNotificationPopover() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const adminIdRef = useRef<string | null>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [toast, setToast] = useState<AdminNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<"checking" | "live" | "offline">("checking");
  const [busyIds, setBusyIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadForAdmin = async (adminId: string) => {
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("id,user_id,pr_no,type,title,message,is_read,created_at")
        .eq("user_id", adminId)
        .in("type", [...ADMIN_NOTIFICATION_TYPES])
        .order("created_at", { ascending: false })
        .limit(20);

      if (queryError) {
        console.error("Unable to load persistent admin notifications:", queryError);
        if (!cancelled) setError("Notifications could not be loaded. Please refresh the page.");
        return;
      }

      if (!cancelled) {
        setItems((current) => {
          const merged = new Map<string, AdminNotification>();
          for (const item of current) merged.set(item.id, item);
          for (const item of (data || []) as AdminNotification[]) merged.set(item.id, item);
          return [...merged.values()]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20);
        });
        setError(null);
      }
    };

    const connect = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          if (!cancelled) {
            setConnection("offline");
            setError("Sign in again to view admin notifications.");
          }
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
          if (!cancelled) {
            setConnection("offline");
            setError("Admin access is required to view these notifications.");
          }
          return;
        }

        adminIdRef.current = user.id;

        channel = supabase
          .channel("admin-persistent-notifications-" + user.id)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: "user_id=eq." + user.id,
            },
            (payload) => {
              const item = payload.new as AdminNotification;
              if (!(ADMIN_NOTIFICATION_TYPES as readonly string[]).includes(item.type)) return;

              setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, 20));
              setToast(item);
              if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
              toastTimerRef.current = window.setTimeout(() => setToast(null), 7000);

              window.dispatchEvent(new Event("admin-action-counts-refresh"));
            }
          )
          .subscribe((status) => {
            if (cancelled) return;
            setConnection(
              status === "SUBSCRIBED"
                ? "live"
                : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
                ? "offline"
                : "checking"
            );
          });
        // Subscribe before loading the saved list so inserts during page startup are not missed.
        await loadForAdmin(user.id);
      } catch (connectError) {
        console.error("Unable to connect admin notification center:", connectError);
        if (!cancelled) {
          setConnection("offline");
          setError("Live notifications are temporarily unavailable. Saved notifications can still be viewed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
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
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unread = items.filter((item) => !item.is_read).length;

  const updateReadState = async (item: AdminNotification, nextReadState: boolean) => {
    const adminId = adminIdRef.current;
    if (!adminId || busyIds.includes(item.id)) return false;

    setBusyIds((current) => [...new Set([...current, item.id])]);
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: nextReadState })
      .eq("id", item.id)
      .eq("user_id", adminId);

    if (updateError) {
      console.error("Unable to update admin notification read status:", updateError);
      setError("Unable to update notification status. Please try again.");
      setBusyIds((current) => current.filter((id) => id !== item.id));
      return false;
    }

    setItems((current) => current.map((entry) => entry.id === item.id
      ? { ...entry, is_read: nextReadState }
      : entry
    ));
    setError(null);
    setBusyIds((current) => current.filter((id) => id !== item.id));
    return true;
  };

  const markRead = async (item: AdminNotification) => {
    if (item.is_read) return true;
    return updateReadState(item, true);
  };

  const toggleRead = async (item: AdminNotification) => {
    await updateReadState(item, !item.is_read);
  };

  const deleteNotification = async (item: AdminNotification) => {
    const adminId = adminIdRef.current;
    if (!adminId || busyIds.includes(item.id)) return;

    setBusyIds((current) => [...new Set([...current, item.id])]);
    const { data: deletedRows, error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", item.id)
      .eq("user_id", adminId)
      .select("id");

    if (deleteError) {
      console.error("Unable to delete admin notification:", deleteError);
      setError("Unable to delete this notification. Please try again.");
      setBusyIds((current) => current.filter((id) => id !== item.id));
      return;
    }

    // RLS may make DELETE affect zero rows without returning a database error.
    // Only remove the item locally after Postgres confirms a deleted row.
    if (!deletedRows || deletedRows.length === 0) {
      setError("This notification was not deleted. Please refresh and try again.");
      setBusyIds((current) => current.filter((id) => id !== item.id));
      return;
    }

    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setToast((current) => current?.id === item.id ? null : current);
    setError(null);
    setBusyIds((current) => current.filter((id) => id !== item.id));
  };

  const markAllRead = async () => {
    const adminId = adminIdRef.current;
    if (!adminId || unread === 0) return;

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", adminId)
      .eq("is_read", false)
      .in("type", [...ADMIN_NOTIFICATION_TYPES]);

    if (updateError) {
      console.error("Unable to mark all admin notifications as read:", updateError);
      setError("Unable to mark notifications as viewed. Please try again.");
      return;
    }

    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  };

  const openNotification = async (item: AdminNotification) => {
    const updated = await markRead(item);
    if (!updated) return;
    setOpen(false);
    setToast(null);
    router.push(getDestination(item));
  };

  const openLatestFromToast = async () => {
    if (!toast) return;
    await openNotification(toast);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setToast(null);
        }}
        aria-label={"Admin notifications" + (unread ? ", " + unread + " unread" : "")}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={"relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F6D58A]/70 active:scale-95 " + (
          open
            ? "border-[#F6D58A]/50 bg-white/15 text-[#F6D58A]"
            : "border-white/20 bg-white/[0.09] text-white/90 hover:border-[#F6D58A]/45 hover:bg-white/15 hover:text-[#F6D58A]"
        )}
        title="Admin notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F6C453] px-1 text-[9px] font-black text-[#4A002A] ring-2 ring-[#4A002A]">
            {unread > 9 ? "9+" : unread}
          </span>
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
            <p className="text-xs font-extrabold text-[#4D002C]">{toast.title}</p>
            <p className="mt-0.5 break-words text-[11px] text-stone-600">{toast.message}</p>
            <button
              type="button"
              onClick={() => void openLatestFromToast()}
              className="mt-1 text-[11px] font-bold text-[#7B0046] underline underline-offset-2"
            >
              Open notification
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
            aria-label="Admin notification center"
            className="fixed left-3 right-3 top-[66px] z-[70] mx-auto max-h-[min(520px,calc(100svh-84px))] w-auto max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_50px_rgba(45,0,26,0.2)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[410px] sm:max-w-[calc(100vw-2rem)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-[#FAF8F5] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7B0046]/10 text-[#7B0046]">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-[#4D002C]">Notification Center</h2>
                    {unread > 0 && (
                      <span className="rounded-full bg-[#7B0046] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                        {unread} unread
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] font-medium text-stone-500">
                    {connection === "live"
                      ? "Live updates · Saved across sessions"
                      : connection === "offline"
                      ? "Saved notifications · Live updates unavailable"
                      : "Loading saved notifications…"}
                  </p>
                </div>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-[#7B0046] transition hover:bg-[#FDF2F7]"
                >
                  <span className="inline-flex items-center gap-1">
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </span>
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-[10px] text-red-700">
                {error}
              </p>
            )}

            <div className="max-h-[min(420px,calc(100svh-190px))] divide-y divide-stone-100 overflow-y-auto">
              {loading ? (
                <div className="px-5 py-10 text-center text-xs text-stone-500">Loading saved notifications…</div>
              ) : items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                    <Bell className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-xs font-bold text-stone-800">No admin notifications yet</p>
                  <p className="mx-auto mt-1 max-w-[260px] text-[11px] leading-relaxed text-stone-500">
                    New PR submissions, personnel registrations, official PR number assignments, and PR stage changes will appear here.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={"flex items-start gap-2 px-3.5 py-3 transition-colors " + (
                      item.is_read ? "bg-white" : "bg-[#FFFDF7]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void openNotification(item)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-lg py-0.5 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7B0046]"
                      aria-label={"Open notification: " + item.title}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#7B0046]/15 bg-[#FDF2F7] text-[#7B0046]">
                        {getIcon(item.type)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-xs font-extrabold text-[#4D002C]">{item.title}</span>
                          {!item.is_read && (
                            <span className="shrink-0 rounded-full bg-[#7B0046] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block break-words text-[11px] leading-relaxed text-stone-600">{item.message}</span>
                        {item.pr_no && (
                          <span className="mt-1 block break-all font-mono text-[10px] font-bold text-[#7B0046]">{item.pr_no}</span>
                        )}
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-stone-400">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.created_at)}
                        </span>
                      </span>
                    </button>

                    <div className="mt-0.5 flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={busyIds.includes(item.id)}
                        onClick={() => void toggleRead(item)}
                        aria-label={item.is_read ? "Mark as unread" : "Mark as read"}
                        title={item.is_read ? "Mark as unread" : "Mark as read"}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:border-[#7B0046]/25 hover:bg-[#FDF2F7] hover:text-[#7B0046] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B0046] disabled:cursor-wait disabled:opacity-40"
                      >
                        {item.is_read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        disabled={busyIds.includes(item.id)}
                        onClick={() => void deleteNotification(item)}
                        aria-label={"Delete notification: " + item.title}
                        title="Delete notification"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-wait disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-stone-100 bg-stone-50/70 px-3 py-2 text-center">
              <p className="text-[10px] text-stone-500">Notifications are saved to your administrator account.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
