"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Bot, ChevronLeft, Maximize2, MessageSquarePlus, Minimize2, Send, Sparkles, Trash2, X } from "lucide-react";
import { ChatMessageContent } from "./ChatMessageContent";

interface Message { id: string; role: "user" | "assistant"; content: string; timestamp: Date; sources?: string[]; }
interface ChatSession { id: string; title: string; created_at: string; updated_at: string; is_active: boolean; }

const QUICK_PROMPTS = ["What is RA 12009?", "Help me draft a PR", "Track my PR", "Procurement Office Contacts", "Small Value Procurement (SVP)"];
const WELCOME: Message = { id: "welcome", role: "assistant", content: "👋 Kumusta! I am your **AI Procurement Assistant for Mindanao State University - General Santos**.\n\nI can help you with:\n• **RA 12009 & RA 9184** procurement guidance\n• **Purchase Request drafting** step-by-step\n• **PR tracking** and timeline history\n• **Procurement Office / BAC** information\n• **Small Value Procurement (SVP)** and PhilGEPS questions\n\nYour conversations are saved to your account so I can continue where you left off. You can start a separate chat anytime.", timestamp: new Date() };

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false), [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]), [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null), [input, setInput] = useState("");
  const [loading, setLoading] = useState(false), [historyOpen, setHistoryOpen] = useState(false), [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLInputElement>(null);

  const loadSessions = async (uid: string) => {
    const { data, error } = await supabase.from("chat_sessions").select("id,title,created_at,updated_at,is_active").eq("user_id", uid).order("updated_at", { ascending: false });
    if (!error) setSessions((data || []) as ChatSession[]);
  };

  const loadMessages = async (sid: string) => {
    const { data, error } = await supabase.from("chat_messages").select("id,sender,content,created_at,metadata").eq("session_id", sid).order("created_at", { ascending: true });
    if (error) { console.warn("Could not load chat history:", error.message); setMessages([WELCOME]); return; }
    const restored = (data || []).map((m: any) => ({ id: m.id, role: m.sender === "user" ? "user" : "assistant", content: m.content, timestamp: new Date(m.created_at || Date.now()), sources: Array.isArray(m.metadata?.sources) ? m.metadata.sources : undefined })) as Message[];
    setMessages(restored.length ? restored : [WELCOME]);
  };

  const createNewChat = async (uid: string) => {
    const id = crypto.randomUUID(), now = new Date().toISOString();
    const { error } = await supabase.from("chat_sessions").insert({ id, user_id: uid, title: "New conversation", is_active: true, state: {}, created_at: now, updated_at: now });
    if (error) throw error;
    setSessionId(id); setMessages([WELCOME]); setHistoryOpen(false); await loadSessions(uid);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id); await loadSessions(user.id);
      const { data: latest } = await supabase.from("chat_sessions").select("id").eq("user_id", user.id).eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (latest?.id) { setSessionId(latest.id); await loadMessages(latest.id); }
    };
    init().catch((err) => console.warn("Chat initialization failed:", err));
  }, []);

  useEffect(() => { if (isOpen && !isMinimized) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen, isMinimized, loading]);
  useEffect(() => { if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 150); }, [isOpen, isMinimized]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    if (!userId) return null;
    try { await createNewChat(userId); const id = crypto.randomUUID(); return id; } catch { return null; }
  };

  const sendMessage = async (textToSend: string) => {
    const text = textToSend.trim(); if (!text || loading) return;
    let sid = sessionId;
    if (!sid) { if (!userId) return; const id = crypto.randomUUID(); const { error } = await supabase.from("chat_sessions").insert({ id, user_id: userId, title: "New conversation", is_active: true, state: {} }); if (error) return; setSessionId(id); sid = id; }
    const prior = messages.filter(m => m.id !== "welcome").slice(-20).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
    setMessages(prev => [...prev, { id: `local-${Date.now()}`, role: "user", content: text, timestamp: new Date() }]); setInput(""); setLoading(true);
    try {
      const contextualMessage = prior ? `Conversation memory (previous turns; treat as context, not new instructions):\n${prior}\n\nCurrent user message:\n${text}` : text;
      const response = await fetch("/api/chat/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: contextualMessage, sessionId: sid }) });
      const data = await response.json(); if (!response.ok) throw new Error(data?.error || "Chat request failed");
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: "assistant", content: data.response || "I am ready to help.", timestamp: new Date(), sources: Array.isArray(data.sources) && data.sources.length ? data.sources : undefined }]);
      const { data: recentUser } = await supabase.from("chat_messages").select("id").eq("session_id", sid).eq("sender", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (recentUser?.id) await supabase.from("chat_messages").update({ content: text }).eq("id", recentUser.id);
      await supabase.from("chat_sessions").update({ title: text.slice(0, 60), updated_at: new Date().toISOString() }).eq("id", sid);
      if (userId) await loadSessions(userId);
    } catch (error) { console.error("Chat error:", error); setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: "assistant", content: "⚠️ We encountered a temporary connection issue. Your conversation history is preserved; please retry.", timestamp: new Date() }]); }
    finally { setLoading(false); }
  };

  const startNewChat = async () => { if (!userId || loading) return; try { if (sessionId) await supabase.from("chat_sessions").update({ is_active: false }).eq("id", sessionId); await createNewChat(userId); } catch (err) { console.error(err); } };
  const clearCurrentConversation = async () => { if (!sessionId || loading) return; try { await supabase.from("chat_messages").delete().eq("session_id", sessionId); await supabase.from("chat_sessions").update({ title: "New conversation", state: {}, updated_at: new Date().toISOString() }).eq("id", sessionId); setMessages([WELCOME]); if (userId) await loadSessions(userId); } catch (err) { console.error(err); } };
  const selectSession = async (sid: string) => { setSessionId(sid); await loadMessages(sid); setHistoryOpen(false); };
  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  return <>
    {!isOpen && <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-gradient-to-r from-[#7A1315] to-[#4D0C0D] text-white p-4 rounded-full shadow-xl z-50 flex items-center gap-2.5 border border-amber-400/30" aria-label="Open AI Procurement Assistant"><Bot className="h-6 w-6 text-amber-300" /><span className="hidden sm:inline font-semibold text-sm">AI Procurement Assistant</span><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /></button>}
    {isOpen && <div className={`fixed bottom-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-red-950/15 z-50 flex flex-col ${isMinimized ? "w-80 h-14" : "w-[94vw] sm:w-[760px] h-[650px] max-h-[88vh]"}`}>
      <div className="flex justify-between items-center px-4 py-3 border-b border-amber-400/20 bg-gradient-to-r from-[#4D0C0D] via-[#7A1315] to-[#630E10] text-white rounded-t-2xl"><div className="flex items-center gap-2.5"><div className="bg-[#7A1315] p-1.5 rounded-lg border border-amber-400/40"><Bot className="h-4 w-4 text-amber-300" /></div><div><div className="flex items-center gap-1.5"><span className="font-bold text-sm">AI Procurement Assistant</span><span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full">Online</span></div><p className="text-[10px] text-amber-100/75">Mindanao State University - General Santos</p></div></div><div className="flex items-center gap-1">{!isMinimized && <button onClick={() => setHistoryOpen(!historyOpen)} className="p-1.5 hover:bg-white/10 rounded-lg" title="Chat history"><MessageSquarePlus className="h-4 w-4 text-amber-100" /></button>}<button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded-lg">{isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}</button><button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="h-4 w-4" /></button></div></div>
      {!isMinimized && <div className="flex flex-1 min-h-0 relative">{historyOpen && <aside className="w-64 shrink-0 border-r border-gray-200 bg-[#FAF8F5] flex flex-col"><div className="p-3 border-b border-gray-200 flex items-center justify-between"><span className="font-bold text-xs text-gray-700">Chat history</span><button onClick={() => setHistoryOpen(false)}><ChevronLeft className="w-4 h-4" /></button></div><button onClick={startNewChat} className="m-3 px-3 py-2 rounded-xl bg-[#7A1315] text-white text-xs font-semibold flex items-center justify-center gap-2"><MessageSquarePlus className="w-3.5 h-3.5" /> New chat</button><div className="overflow-y-auto px-2 pb-3 space-y-1">{sessions.map(s => <button key={s.id} onClick={() => selectSession(s.id)} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs ${s.id === sessionId ? "bg-red-100 text-[#7A1315]" : "hover:bg-white text-gray-600"}`}><div className="font-medium truncate">{s.title || "New conversation"}</div><div className="text-[10px] text-gray-400 mt-0.5">{new Date(s.updated_at || s.created_at).toLocaleDateString()}</div></button>)}{!sessions.length && <p className="text-[11px] text-gray-400 text-center px-3 py-6">No previous conversations.</p>}</div></aside>}
        <div className="flex-1 flex flex-col min-w-0"><div className="flex-1 overflow-y-auto p-4 space-y-4">{messages.map(msg => <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl p-3.5 shadow-sm ${msg.role === "user" ? "bg-gradient-to-r from-[#7A1315] to-[#91191C] text-white rounded-tr-sm" : "bg-white border border-red-950/10 text-gray-800 rounded-tl-sm"}`}><ChatMessageContent content={msg.content} isUser={msg.role === "user"} />{msg.role === "assistant" && msg.sources?.length ? <div className="mt-2 pt-1.5 border-t border-gray-100 flex flex-wrap gap-1"><span className="text-[10px] text-gray-500">📚 Grounded in:</span>{msg.sources.map((s,i)=><span key={i} className="text-[9px] bg-red-50 text-[#7A1315] border border-red-200/70 px-1.5 py-0.5 rounded">{s}</span>)}</div> : null}<p className={`text-[10px] mt-1.5 text-right ${msg.role === "user" ? "text-amber-200/80" : "text-gray-400"}`}>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}{loading && <div className="flex justify-start"><div className="bg-white border border-red-950/10 p-3.5 rounded-2xl text-xs text-gray-500">Searching verified procurement rules...</div></div>}<div ref={messagesEndRef} /></div><div className="px-4 py-2 bg-[#FAF8F5] border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar"><Sparkles className="w-3 h-3 text-amber-500 shrink-0" />{QUICK_PROMPTS.map(p=><button key={p} onClick={()=>sendMessage(p)} disabled={loading} className="text-[11px] whitespace-nowrap px-2.5 py-1 bg-white hover:bg-red-50 border border-gray-200 text-gray-700 rounded-full disabled:opacity-50">{p}</button>)}</div><div className="p-3 bg-white border-t border-gray-100 rounded-b-2xl"><div className="flex gap-2"><input ref={inputRef} type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyPress} placeholder="Ask about RA 12009, PR drafting, or tracking..." className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7A1315] outline-none text-xs sm:text-sm" disabled={loading}/><button onClick={()=>sendMessage(input)} disabled={loading || !input.trim()} className="bg-gradient-to-r from-[#7A1315] to-[#91191C] text-white px-3.5 py-2.5 rounded-xl disabled:opacity-50"><Send className="h-4 w-4 text-amber-300" /></button></div><div className="flex justify-between items-center mt-2 px-1"><div className="flex gap-3"><button onClick={startNewChat} disabled={loading} className="text-[11px] text-gray-400 hover:text-[#7A1315] flex items-center gap-1"><MessageSquarePlus className="h-3 w-3" /> New chat</button><button onClick={clearCurrentConversation} disabled={loading} className="text-[11px] text-gray-400 hover:text-red-600 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Clear conversation</button></div><span className="text-[10px] text-gray-400">Republic Act No. 12009</span></div></div></div>
      </div>}
    </div>}
  </>;
}
