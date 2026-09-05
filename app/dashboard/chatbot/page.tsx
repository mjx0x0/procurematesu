"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ChatMessageContent } from "@/components/chatbot/ChatMessageContent";
import {
  Send, Bot, Loader2, ArrowLeft, Trash2, Copy, Check, Sparkles
} from "lucide-react";

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
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  sources?: string[];
  prOptions?: PRChoice[];
}

const SUGGESTIONS = [
  "What is RA 12009?",
  "Help me draft a PR",
  "Track my PR",
  "How does Small Value Procurement work?",
  "Explain the bidding process",
  "MSU-GenSan Procurement Flow",
];

export default function ChatbotDashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // If in preview/mock mode or no user, create a temporary guest user
          setUser({ id: 'guest-user', email: 'guest@msugensan.edu.ph' });
          setIsAuthenticated(true);
        } else {
          setUser(user);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setUser({ id: 'guest-user', email: 'guest@msugensan.edu.ph' });
        setIsAuthenticated(true);
      }

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "👋 Kumusta! I am your official **AI Procurement Assistant for Mindanao State University - General Santos**.\n\n" +
            "I can assist you with:\n" +
            "• **Republic Act No. 12009 (New Government Procurement Act)** and RA 9184 IRR\n" +
            "• **Drafting Purchase Requests** step-by-step with instant print & form generation (try clicking *'Help me draft a PR'* below)\n" +
            "• **Tracking PR status** — say *'Track my PR'* and I will show your submitted PRs to choose from\n" +
            "• **Contact Details** of the MSU-GenSan Procurement Management Office and BAC Secretariat\n" +
            "• **Alternative Procurement Modalities** (Small Value Procurement, Shopping, Direct Contracting)\n\n" +
            "How may I assist your procurement needs today?",
          timestamp: new Date(),
        },
      ]);
    };
    checkAuth();
  }, [router]);

  const addAssistantMessage = (content: string, prOptions?: PRChoice[]) => {
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      prOptions,
    }]);
  };

  const isTrackMyPRRequest = (text: string) => {
    const lower = text.toLowerCase().replace(/[’']/g, "'").trim();
    return /\btrack\s+(my|all|submitted)\s+(pr|prs|purchase\s+requests?)\b/.test(lower) ||
      /\btrack\s+my\s+purchase\s+request\b/.test(lower) ||
      /\bshow\s+(me\s+)?my\s+(pr|prs|purchase\s+requests?)\b/.test(lower) ||
      /\bmy\s+(pr|prs|purchase\s+requests?)\s+(status|tracking|progress)\b/.test(lower);
  };

  const loadMyPRs = async () => {
    const response = await fetch('/api/chat/my-prs', {
      method: 'GET',
      cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to load your purchase requests.');
    }

    return Array.isArray(data.prs) ? data.prs as PRChoice[] : [];
  };

  const handleTrackMyPR = async () => {
    const prs = await loadMyPRs();

    if (prs.length === 0) {
      addAssistantMessage(
        "📋 **You don't have any submitted Purchase Requests yet.**\n\n" +
        "Once you submit a PR, you can say **\"Track my PR\"** here and choose which request you want to track."
      );
      return;
    }

    addAssistantMessage(
      `📋 **Which Purchase Request would you like to track?**\n\nI found **${prs.length} submitted PR${prs.length === 1 ? '' : 's'}** under your account. Select one below.`,
      prs
    );
  };

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // "Track my PR" is handled locally through the authenticated endpoint so
    // the user gets a list containing only their own submitted PRs.
    if (isTrackMyPRRequest(text)) {
      try {
        await handleTrackMyPR();
      } catch (error) {
        console.error('Track my PR error:', error);
        addAssistantMessage('❌ I could not load your submitted Purchase Requests right now. Please try again.');
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      return;
    }

    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '...',
      timestamp: new Date(),
      isLoading: true,
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: user?.id,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
              ...msg,
              content: data.response || 'Sorry, I could not process your request.',
              sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : undefined,
              isLoading: false
            }
          : msg
      ));

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
              ...msg,
              content: '❌ We encountered a temporary connection issue. Please feel free to try again.',
              isLoading: false
            }
          : msg
      ));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handlePRSelection = async (prNo: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Track ${prNo}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      const loadingId = `${Date.now()}-track`;
      setMessages(prev => [...prev, {
        id: loadingId,
        role: 'assistant',
        content: '...',
        timestamp: new Date(),
        isLoading: true,
      }]);

      // The selected PR came from the authenticated user's own PR list.
      // Keep the existing chatbot tracking response/timeline presentation.
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Track ${prNo}`,
          userId: user?.id,
          sessionId: sessionId,
        }),
      });
      const data = await response.json();

      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
              ...msg,
              content: data.response || `I could not retrieve the status for ${prNo}.`,
              sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : undefined,
              isLoading: false,
            }
          : msg
      ));

      if (data.sessionId) setSessionId(data.sessionId);
    } catch (error) {
      console.error('PR selection tracking error:', error);
      setMessages(prev => prev.map(msg =>
        msg.isLoading
          ? {
              ...msg,
              content: '❌ We encountered a temporary connection issue while tracking that PR. Please try again.',
              isLoading: false,
            }
          : msg
      ));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "👋 Chat history cleared. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
    setSessionId(null);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      pending: "Pending",
      for_approval: "For Approval",
      budget_office: "Budget Office",
      chancellor_approval: "Chancellor Approval",
      procurement_processing: "Processing",
      canvassing: "Canvassing",
      bidding: "Bidding",
      for_award: "For Award",
      po_issued: "PO Issued",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status.replace(/_/g, ' ');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-red-950/10 px-4 py-3 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 text-gray-500 hover:text-[#7A1315] hover:bg-red-50 rounded-lg transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="bg-[#7A1315] p-2 rounded-xl shadow-xs text-amber-300 border border-amber-400/30">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg text-[#4D0C0D] leading-tight">AI Procurement Assistant</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Online
                  </span>
                </div>
                <p className="text-xs text-gray-500">Mindanao State University - General Santos</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearChat}
              className="text-gray-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Conversation
            </button>
          </div>
        </div>
      </nav>

      {/* Main Chat Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        <div className="flex-1 bg-white rounded-2xl shadow-xs border border-stone-200 flex flex-col overflow-hidden">
          
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#7A1315] to-[#91191C] text-white rounded-tr-sm'
                      : 'bg-white border border-red-950/10 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 py-1">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#7A1315] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#91191C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs">Searching verified procurement rules...</span>
                    </div>
                  ) : (
                    <>
                      <ChatMessageContent content={msg.content} isUser={msg.role === 'user'} />

                      {msg.prOptions && msg.prOptions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.prOptions.map((pr) => (
                            <button
                              key={pr.pr_no}
                              onClick={() => handlePRSelection(pr.pr_no)}
                              disabled={loading}
                              className="w-full text-left bg-[#FAF8F5] hover:bg-red-50 border border-stone-200 hover:border-red-200 rounded-xl p-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-sm text-[#7A1315]">{pr.pr_no}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white border border-stone-200 text-gray-600">
                                  {getStatusLabel(pr.current_stage)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 mt-1 line-clamp-2">{pr.purpose || 'Purchase Request'}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-500">
                                {pr.department && <span>{pr.department}</span>}
                                <span>₱{Number(pr.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex items-center flex-wrap gap-1.5">
                          <span className="text-[11px] text-gray-500 font-medium">📚 Grounded in verified documents:</span>
                          {msg.sources.map((src, i) => (
                            <span key={i} className="text-[10px] font-semibold bg-red-50 text-[#7A1315] border border-red-200/70 px-2 py-0.5 rounded-md shadow-xs">
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-black/5">
                        <span className={`text-[10px] ${msg.role === 'user' ? 'text-amber-200/80' : 'text-gray-400'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 text-[11px]"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600 text-[10px]">Copied</span>
                              </>
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 sm:px-6 py-2.5 bg-[#FAF8F5] border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Suggested:
            </span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                disabled={loading}
                className="text-xs whitespace-nowrap px-3 py-1.5 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-700 hover:text-[#7A1315] rounded-full transition-all duration-150 shadow-2xs disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about RA 12009, PR drafting, or say 'Track my PR'..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none transition-all text-sm"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-[#7A1315] to-[#91191C] hover:from-[#630E10] hover:to-[#7A1315] text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-red-950/20 hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 border border-amber-400/20"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="h-4 w-4 text-amber-300" />
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-gray-400">
              <span>Grounded on Republic Act No. 12009 & MSU-GenSan Procurement Manual</span>
              <span>{sessionId ? 'Session Active' : 'New Session'}</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
