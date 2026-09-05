"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  MessageSquareText,
  XCircle,
} from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  pr_no: string | null;
  type: "info" | "update" | "remark" | "rejected";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("id,user_id,pr_no,type,title,message,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (queryError) {
      console.error("Notification load error:", queryError);
      setError("Unable to load notifications right now.");
      return;
    }

    setNotifications((data || []) as Notification[]);
    setError(null);
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const initialLoad = async () => {
      if (!mounted) return;
      setLoading(true);
      await loadNotifications();
      if (mounted) setLoading(false);
    };

    initialLoad();

    // Keep the notification center fresh even if realtime is not enabled on the table.
    const interval = window.setInterval(() => {
      if (mounted) loadNotifications();
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const markAsRead = async (id: string) => {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (updateError) {
      console.error("Mark notification read error:", updateError);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (updateError) {
        console.error("Mark all notifications read error:", updateError);
        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true }))
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const iconFor = (type: Notification["type"]) => {
    if (type === "rejected") return <XCircle className="h-5 w-5" />;
    if (type === "remark") return <MessageSquareText className="h-5 w-5" />;
    return <Bell className="h-5 w-5" />;
  };

  const toneFor = (type: Notification["type"]) => {
    if (type === "rejected") return "bg-red-50 text-red-600 border-red-100";
    if (type === "remark") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-blue-50 text-blue-600 border-blue-100";
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-[#7A1315]"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-[#4D0C0D]">
                <Bell className="h-5 w-5 text-[#7A1315]" />
                Notifications
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#7A1315] px-2 py-0.5 text-[11px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-xs text-stone-500">Updates and remarks from Procurement</p>
            </div>
          </div>

          <button
            onClick={markAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Mark all read
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#7A1315]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-sm">
            <Bell className="mx-auto mb-3 h-10 w-10 text-stone-300" />
            <h2 className="font-bold text-stone-800">No notifications yet</h2>
            <p className="mt-1 text-sm text-stone-500">
              Procurement remarks, rejections, and important PR updates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                  notification.is_read
                    ? "border-stone-200"
                    : "border-[#7A1315]/20 ring-1 ring-[#7A1315]/5"
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${toneFor(notification.type)}`}
                  >
                    {iconFor(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-stone-900">{notification.title}</h2>
                        {!notification.is_read && (
                          <span className="rounded-full bg-[#7A1315] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            New
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-stone-400">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>

                    {notification.pr_no && (
                      <Link
                        href={`/dashboard/pr/${notification.pr_no}`}
                        onClick={() => {
                          if (!notification.is_read) markAsRead(notification.id);
                        }}
                        className="mt-1 inline-block text-xs font-semibold text-[#7A1315] hover:underline"
                      >
                        {notification.pr_no} · View Purchase Request
                      </Link>
                    )}

                    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
                        {notification.message}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#7A1315]"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
