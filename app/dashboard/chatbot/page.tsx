"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ChatMessageContent } from "@/components/chatbot/ChatMessageContent";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronLeft,
  Copy,
  History,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PROCUREMENT_STAGE_LABELS } from "@/lib/procurement-process";

interface PRChoice {
  pr_no: string;
  purpose: string;
  total: number;
  current_stage: string;
  created_at: string;
  department?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  sources?: string[];
  prOptions?: PRChoice[];
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

const SUGGESTIONS = [
  "What is RA 12009?",
  "Help me draft a PR",
  "Track my PR",
  "How does Small Value Procurement work?",
  "Explain the bidding process",
  "MSU-GenSan Procurement Flow",
];

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "👋 Kumusta! I am your official **AI Procurement Assistant for Mindanao State University - General Santos**.\n\nI can help you with:\n• **RA 12009 & RA 9184** procurement guidelines\n• **Purchase Request drafting** step-by-step\n• **PR tracking** and 20-stage timeline status\n• **Procurement Office (PMO) & BAC** requirements\n• **Small Value Procurement (SVP)** and PhilGEPS thresholds\n\nYour conversations are automatically saved. Ask me anything or choose a quick prompt below!",
  timestamp: new Date(),
};

export default function ChatbotDashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    } catch {
      return null;
    }
  };

  const loadSessions = async (uid: string) => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id,title,created_at,updated_at,is_active")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    setSessions((data || []) as ChatSession[]);
    return (data || []) as ChatSession[];
  };

  const loadMessages = async (sid: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,sender,content,created_at,metadata")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const restored = (data || []).map((m: any) => ({
      id: m.id,
      role: m.sender === "user" ? "user" : "assistant",
      content: m.content,
      timestamp: new Date(m.created_at || Date.now()),
      sources: Array.isArray(m.metadata?.sources) ? m.metadata.sources : undefined,
      prOptions: Array.isArray(m.metadata?.prOptions) ? m.metadata.prOptions : undefined,
    })) as Message[];
    setMessages(restored.length ? restored : [{ ...WELCOME, timestamp: new Date() }]);
  };

  const createSession = async (uid: string) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from("chat_sessions").insert({
      id,
      user_id: uid,
      title: "New conversation",
      is_active: true,
      state: {},
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    setSessionId(id);
    setMessages([{ ...WELCOME, timestamp: new Date() }]);
    await loadSessions(uid);
    return id;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace("/auth/login");
          return;
        }
        if (cancelled) return;
        setUserId(user.id);
        const list = await loadSessions(user.id);
        const active = list.find((s) => s.is_active);
        if (active) {
          setSessionId(active.id);
          await loadMessages(active.id);
        } else {
          setMessages([{ ...WELCOME, timestamp: new Date() }]);
        }
      } catch (e) {
        console.error("Chat initialization failed:", e);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!initializing) setTimeout(() => inputRef.current?.focus(), 100);
  }, [initializing, sessionId]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    if (!userId) return null;
    return createSession(userId);
  };

  const persistMessage = async (
    sid: string,
    role: "user" | "assistant",
    content: string,
    metadata?: Record<string, unknown>
  ) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ session_id: sid, sender: role, content, metadata: metadata || {} })
      .select("id,created_at")
      .single();
    if (error) throw error;
    return data;
  };

  const isTrackMyPR = (text: string) => {
    const q = text.toLowerCase().replace(/[’']/g, "'").trim();
    return (
      /\btrack\s+(my|all|submitted)\s+(pr|prs|purchase\s+requests?)\b/.test(q) ||
      /\btrack\s+my\s+purchase\s+request\b/.test(q) ||
      /\bshow\s+(me\s+)?my\s+(pr|prs|purchase\s+requests?)\b/.test(q) ||
      /\bmy\s+(pr|prs|purchase\s+requests?)\s+(status|tracking|progress)\b/.test(q)
    );
  };

  const loadMyPRs = async (): Promise<PRChoice[]> => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const r = await fetch("/api/chat/my-prs", { headers, cache: "no-store", credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.prs)) return d.prs as PRChoice[];
      }
    } catch (apiErr) {
      console.warn("API /api/chat/my-prs failed, falling back to direct query:", apiErr);
    }

    // Direct Supabase client fallback
    try {
      let query = supabase
        .from("purchase_requests")
        .select("pr_no, purpose, total, current_stage, created_at, department")
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as PRChoice[];
      }
    } catch (clientErr) {
      console.error("Direct Supabase PR fallback failed:", clientErr);
    }
    return [];
  };

  const addLocal = (role: "user" | "assistant", content: string, prOptions?: PRChoice[]) =>
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random()}`,
        role,
        content,
        timestamp: new Date(),
        prOptions,
      },
    ]);

  const sendMessage = async (message?: string) => {
    const text = (message ?? input).trim();
    if (!text || loading) return;
    let sid: string | null = await ensureSession();
    if (!sid) return;

    const previous = messages.filter((m) => m.id !== "welcome" && !m.isLoading).slice(-12);
    addLocal("user", text);
    setInput("");
    setLoading(true);

    try {
      if (isTrackMyPR(text)) {
        await persistMessage(sid, "user", text);
        const prs = await loadMyPRs();
        const response = prs.length
          ? `📋 **Which Purchase Request would you like to track?**\n\nI found **${prs.length} submitted PR${prs.length === 1 ? "" : "s"}** under your account. Select one below to view its complete 20-stage timeline status.`
          : `📋 **You don't have any submitted Purchase Requests yet.**\n\nOnce you submit a Purchase Request in the system, you can say **"Track my PR"** and I will display your real-time tracking status here.`;

        await persistMessage(sid, "assistant", response, prs.length ? { prOptions: prs } : {});
        addLocal("assistant", response, prs.length ? prs : undefined);
        await supabase
          .from("chat_sessions")
          .update({ title: text.slice(0, 60), updated_at: new Date().toISOString() })
          .eq("id", sid);
        if (userId) await loadSessions(userId);
        return;
      }

      const history = previous.map((m) => ({ role: m.role, content: m.content }));
      const token = await getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ message: text, sessionId: sid, history }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Chat request failed");

      addLocal("assistant", data.response || "I could not process that request.");
      await supabase
        .from("chat_sessions")
        .update({ title: text.slice(0, 60), updated_at: new Date().toISOString() })
        .eq("id", sid);
      if (userId) await loadSessions(userId);
    } catch (e: any) {
      console.error("Chat error:", e);
      setMessages((prev) =>
        prev.concat({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: e?.message || "❌ We encountered a temporary connection issue. Please try again.",
          timestamp: new Date(),
        })
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handlePRSelection = async (prNo: string) => {
    if (loading) return;
    let sid = await ensureSession();
    if (!sid) return;
    setLoading(true);
    try {
      addLocal("user", `Track ${prNo}`);
      const token = await getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ message: `Track ${prNo}`, sessionId: sid }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to track PR");
      addLocal("assistant", data.response || `I could not retrieve the status for ${prNo}.`);
      await supabase
        .from("chat_sessions")
        .update({ title: `Track ${prNo}`.slice(0, 60), updated_at: new Date().toISOString() })
        .eq("id", sid);
      if (userId) await loadSessions(userId);
    } catch (e: any) {
      console.error(e);
      setMessages((prev) =>
        prev.concat({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "❌ We could not retrieve that PR right now. Please try again.",
          timestamp: new Date(),
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    if (!userId || loading) return;
    try {
      if (sessionId) {
        await supabase
          .from("chat_sessions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", sessionId)
          .eq("user_id", userId);
      }
      await createSession(userId);
      setMobileHistoryOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Completely custom in-app confirmation modal — NO browser-native window.confirm!
  const handleConfirmClear = async () => {
    if (!sessionId || loading) return;
    setLoading(true);
    setShowClearModal(false);
    try {
      const { error } = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
      if (error) throw error;
      await supabase
        .from("chat_sessions")
        .update({ title: "New conversation", state: {}, updated_at: new Date().toISOString(), is_active: true })
        .eq("id", sessionId)
        .eq("user_id", userId);
      setMessages([{ ...WELCOME, timestamp: new Date() }]);
      if (userId) await loadSessions(userId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Completely custom in-app confirmation modal — NO browser-native window.confirm!
  const handleConfirmDelete = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    const sid = deleteId;
    try {
      await supabase.from("chat_messages").delete().eq("session_id", sid);
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sid)
        .eq("user_id", userId);
      if (error) throw error;

      const remaining = await loadSessions(userId!);
      if (sid === sessionId) {
        const next = remaining.find((s) => s.is_active) || remaining[0];
        if (next) {
          await supabase
            .from("chat_sessions")
            .update({ is_active: true })
            .eq("id", next.id)
            .eq("user_id", userId);
          setSessionId(next.id);
          await loadMessages(next.id);
        } else {
          setSessionId(null);
          setMessages([{ ...WELCOME, timestamp: new Date() }]);
        }
      }
      setDeleteId(null);
    } catch (e) {
      console.error("Delete chat error:", e);
    } finally {
      setDeleting(false);
    }
  };

  const selectSession = async (sid: string) => {
    if (loading || sid === sessionId) {
      setMobileHistoryOpen(false);
      return;
    }
    try {
      setLoading(true);
      if (userId) await supabase.from("chat_sessions").update({ is_active: false }).eq("user_id", userId);
      await supabase
        .from("chat_sessions")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", sid)
        .eq("user_id", userId);
      setSessionId(sid);
      await loadMessages(sid);
      if (userId) await loadSessions(userId);
      setMobileHistoryOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const statusLabel = (s: string) =>
    PROCUREMENT_STAGE_LABELS[s] ||
    ({
      completed: "Completed",
      rejected: "Rejected",
      cancelled: "Cancelled",
    } as Record<string, string>)[s] ||
    s.replace(/_/g, " ");

  const visibleSessions = useMemo(() => sessions, [sessions]);

  if (initializing)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#7A1315] mx-auto mb-3" />
          <p className="text-xs font-semibold text-stone-600">Connecting to MSU-GenSan Procurement Assistant...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 sm:p-2 rounded-lg text-stone-600 hover:bg-red-50 hover:text-[#7A1315] transition-colors shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="bg-[#7A1315] p-2 rounded-xl text-amber-300 border border-amber-400/30 shadow-xs shrink-0">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[#4D0C0D] text-sm sm:text-base truncate leading-tight">
                AI Procurement Assistant
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-500 truncate hidden xs:block">
                Mindanao State University - General Santos
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile History Toggle Button */}
            <button
              onClick={() => setMobileHistoryOpen(true)}
              className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-[#7A1315] text-xs font-medium flex items-center gap-1"
              title="Chat History"
            >
              <History className="h-4 w-4" />
            </button>

            <button
              onClick={startNewChat}
              disabled={loading}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#7A1315] hover:bg-[#630E10] text-white text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-xs transition-colors border border-amber-400/30 disabled:opacity-50"
            >
              <MessageSquarePlus className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden sm:inline">New Chat</span>
              <span className="sm:hidden">New</span>
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              disabled={loading || !sessionId}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-stone-200 hover:border-red-200 text-stone-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors disabled:opacity-40"
              title="Clear current chat"
            >
              <Trash2 className="h-3.5 w-3.5 text-stone-400" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6 flex gap-4 min-h-0">
        {/* Desktop Sidebar: Chat History */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
            <div>
              <h2 className="font-bold text-[#4D0C0D] text-sm flex items-center gap-1.5">
                <History className="h-4 w-4 text-[#7A1315]" /> Chat History
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">Saved conversations</p>
            </div>
          </div>

          <div className="p-3">
            <button
              onClick={startNewChat}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#7A1315]/40 text-[#7A1315] bg-red-50/50 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <MessageSquarePlus className="h-4 w-4" /> Start New Conversation
            </button>
          </div>

          <div className="flex-1 px-2 pb-3 overflow-y-auto space-y-1">
            {visibleSessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-1 rounded-xl transition-colors ${
                  s.id === sessionId ? "bg-red-50 text-[#7A1315]" : "hover:bg-stone-50 text-stone-700"
                }`}
              >
                <button
                  onClick={() => selectSession(s.id)}
                  className="flex-1 min-w-0 text-left px-3 py-2.5"
                >
                  <p className={`text-xs font-semibold truncate ${s.id === sessionId ? "text-[#7A1315]" : "text-stone-700"}`}>
                    {s.title || "New conversation"}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => setDeleteId(s.id)}
                  title="Delete chat"
                  className="opacity-0 group-hover:opacity-100 p-2 text-stone-400 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {!visibleSessions.length && (
              <p className="text-center text-xs text-stone-400 py-8 px-4">
                No saved conversations yet. Send a message to start!
              </p>
            )}
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer: Chat History */}
        {mobileHistoryOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileHistoryOpen(false)}
            />

            {/* Drawer Sheet */}
            <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <div className="bg-[#7A1315] p-1.5 rounded-lg text-amber-300">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#4D0C0D] text-sm">Chat History</h2>
                    <p className="text-[11px] text-stone-500">Your saved conversations</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3">
                <button
                  onClick={startNewChat}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[#7A1315]/40 text-[#7A1315] bg-red-50/50 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MessageSquarePlus className="h-4 w-4" /> New Conversation
                </button>
              </div>

              <div className="flex-1 px-2 pb-4 overflow-y-auto space-y-1">
                {visibleSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1 rounded-xl transition-colors ${
                      s.id === sessionId ? "bg-red-50 text-[#7A1315]" : "hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <button
                      onClick={() => selectSession(s.id)}
                      className="flex-1 min-w-0 text-left px-3 py-2.5"
                    >
                      <p className={`text-xs font-semibold truncate ${s.id === sessionId ? "text-[#7A1315]" : "text-stone-700"}`}>
                        {s.title || "New conversation"}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        setMobileHistoryOpen(false);
                        setDeleteId(s.id);
                      }}
                      title="Delete chat"
                      className="p-2 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {!visibleSessions.length && (
                  <p className="text-center text-xs text-stone-400 py-8 px-4">
                    No saved conversations yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <section className="flex-1 min-w-0 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 min-h-[55vh]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[#7A1315] to-[#91191C] text-white rounded-tr-sm shadow-xs"
                      : "bg-[#FAF8F5] border border-stone-200 text-stone-800 rounded-tl-sm shadow-2xs"
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-[#7A1315] animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-[#7A1315] animate-bounce [animation-delay:300ms]" />
                      <span className="text-xs text-stone-500 ml-2">Consulting procurement guidelines...</span>
                    </div>
                  ) : (
                    <>
                      <ChatMessageContent content={msg.content} isUser={msg.role === "user"} />

                      {/* Interactive Trackable PR Option Cards */}
                      {msg.prOptions && msg.prOptions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A1315]">
                            Select a PR to track:
                          </p>
                          {msg.prOptions.map((pr) => (
                            <button
                              key={pr.pr_no}
                              onClick={() => handlePRSelection(pr.pr_no)}
                              disabled={loading}
                              className="w-full text-left p-3 rounded-xl border border-stone-200 bg-white hover:bg-red-50 hover:border-red-200 transition-colors shadow-2xs disabled:opacity-50 block group"
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-[#7A1315] group-hover:underline">
                                  {pr.pr_no}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200 truncate max-w-[140px]">
                                  {statusLabel(pr.current_stage)}
                                </span>
                              </div>
                              <p className="text-xs text-stone-700 mt-1 line-clamp-2">
                                {pr.purpose || "Official Purchase Request"}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-stone-400 mt-2 pt-1 border-t border-stone-100">
                                <span>
                                  ₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[#7A1315] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                  Track Stage <ArrowRight className="h-3 w-3" />
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Message Footer: Timestamp & Copy */}
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-black/5">
                        <span className={`text-[10px] ${msg.role === "user" ? "text-amber-200/80" : "text-stone-400"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.role === "assistant" && (
                          <button
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="text-stone-400 hover:text-stone-700 p-1 transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl rounded-tl-sm p-3 text-xs text-stone-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7A1315]" />
                  <span>Procurement Assistant is analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 sm:px-4 py-2 bg-[#FAF8F5] border-t border-stone-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Sparkles className="h-3.5 w-3.5 text-[#B88E13] shrink-0" />
            <span className="text-[11px] font-semibold text-stone-500 shrink-0 hidden xs:inline">Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="whitespace-nowrap text-[11px] sm:text-xs px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-red-200 text-stone-700 hover:bg-red-50 hover:text-[#7A1315] transition-colors shadow-2xs disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 sm:p-4 border-t border-stone-200 bg-white">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={keyDown}
                disabled={loading}
                placeholder="Ask about RA 12009, PR drafting, or type 'Track my PR'..."
                className="flex-1 min-w-0 rounded-xl border border-stone-300 bg-white text-gray-900 placeholder:text-stone-400 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#7A1315] focus:ring-2 focus:ring-[#7A1315]/15 transition-all shadow-2xs"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="shrink-0 h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-[#7A1315] to-[#8B1518] hover:from-[#630E10] hover:to-[#7A1315] text-white disabled:opacity-40 transition-colors shadow-xs flex items-center justify-center border border-amber-400/20"
                aria-label="Send message"
              >
                <Send className="h-4 w-4 text-amber-200" />
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-2 text-center sm:text-left">
              Official procurement assistant for MSU-GenSan. Inquiries are grounded in RA 12009 & university regulations.
            </p>
          </div>
        </section>
      </main>

      {/* Custom In-App Modal for Deleting Conversation — NO window.confirm browser popup! */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-gray-900">Delete this conversation?</h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
              This will permanently delete this conversation and all its messages. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Delete Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Modal for Clearing Chat — NO window.confirm browser popup! */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-gray-900">Clear conversation?</h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
              This will clear all messages in this current chat session. You can start fresh.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 rounded-xl bg-[#7A1315] hover:bg-[#630E10] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                Clear Messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
