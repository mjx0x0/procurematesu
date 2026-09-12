"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Bell, Check, CheckCheck, Clock, MessageSquareText, XCircle } from "lucide-react";

interface Notification {
  id: string;
  pr_no: string | null;
  type: "info" | "update" | "remark" | "rejected";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id,pr_no,type,title,message,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    if (!error) setItems((data || []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15000);
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("mousedown", close);
    };
  }, []);

  const unread = items.filter((item) => !item.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  };

  const markAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  };

  const iconFor = (type: Notification["type"]) => {
    if (type === "rejected") return <XCircle className="h-4 w-4" />;
    if (type === "remark") return <MessageSquareText className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) load(); }}
        className="relative rounded-xl p-2 text-stone-500 transition hover:bg-[#FFF7E4] hover:text-[#7A1315]"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#7A1315]/10 bg-white shadow-[0_20px_60px_rgba(45,25,20,.16)]">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <div>
              <p className="text-[11px] font-extrabold text-[#4D0C0D]">Notifications</p>
              <p className="mt-0.5 text-[8px] text-stone-400">Procurement updates and remarks</p>
            </div>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[8px] font-bold text-[#7A1315] transition hover:bg-[#FFF7E4] disabled:opacity-35"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          </div>

          <div className="max-h-[390px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-5 py-10 text-center text-[9px] text-stone-400">Loading notifications…</div>
            ) : items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto h-7 w-7 text-stone-300" />
                <p className="mt-2 text-[10px] font-bold text-stone-700">No notifications yet</p>
                <p className="mt-1 text-[8px] leading-4 text-stone-400">New procurement updates will appear here.</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`border-b border-stone-100 px-4 py-3 ${item.is_read ? "bg-white" : "bg-[#FFFDF7]"}`}>
                  <div className="flex gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${item.type === "rejected" ? "border-red-100 bg-red-50 text-red-600" : item.type === "remark" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-[#7A1315]/10 bg-[#FFF3F0] text-[#7A1315]"}`}>
                      {iconFor(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[9px] font-extrabold text-stone-800">{item.title}</p>
                        {!item.is_read && <span className="rounded-full bg-[#7A1315] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wide text-white">New</span>}
                      </div>
                      <p className="mt-1 text-[8px] leading-4 text-stone-500">{item.message}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[7px] text-stone-400"><Clock className="h-2.5 w-2.5" />{new Date(item.created_at).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          {item.pr_no && <Link href={`/dashboard/pr/${item.pr_no}`} onClick={() => { if (!item.is_read) markRead(item.id); setOpen(false); }} className="text-[7px] font-bold text-[#7A1315] hover:underline">View PR</Link>}
                          {!item.is_read && <button type="button" onClick={() => markRead(item.id)} className="inline-flex items-center gap-1 text-[7px] font-bold text-stone-400 hover:text-[#7A1315]"><Check className="h-2.5 w-2.5" />Read</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
