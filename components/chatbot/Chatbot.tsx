"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Send, Bot, X, Minimize2, Maximize2, Sparkles, Trash2 } from "lucide-react";
import { ChatMessageContent } from "./ChatMessageContent";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
}

const QUICK_PROMPTS = [
  "What is RA 12009?",
  "Help me draft a PR",
  "Track PR-2026-0001",
  "Procurement Office Contacts",
  "Small Value Procurement (SVP)",
];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.warn("Could not retrieve user in chatbot:", err);
      }
    };
    getUser();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Welcome message when chatbot opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "👋 Kumusta! I am your **AI Procurement Assistant for Mindanao State University - General Santos**.\n\n" +
            "I can help you with:\n" +
            "• **RA 12009 & RA 9184 guidelines** and procurement principles\n" +
            "• **Drafting Purchase Requests** step-by-step with instant print & form generation (try *'Help me draft a PR'*)\n" +
            "• **Tracking PR status** and timeline history (e.g. *'Track PR-2026-0001'*)\n" +
            "• **Contact details** of the MSU-GenSan Procurement Management Office and BAC Secretariat\n" +
            "• **Small Value Procurement (SVP)** rules and PhilGEPS requirements\n\n" +
            "How can I assist you today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId: userId,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I am ready to help you with your procurement queries.",
        timestamp: new Date(),
        sources: Array.isArray(data.sources) && data.sources.length > 0 ? data.sources : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "⚠️ We encountered a temporary connection issue. Please feel free to retry your question.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
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

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-[#7A1315] to-[#4D0C0D] hover:from-[#630E10] hover:to-[#7A1315] text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 z-50 flex items-center gap-2.5 group border border-amber-400/30"
          aria-label="Open AI Procurement Assistant"
        >
          <Bot className="h-6 w-6 text-amber-300" />
          <span className="hidden sm:inline font-semibold text-sm pr-1 group-hover:inline transition-all text-amber-100">
            AI Procurement Assistant
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-red-950/15 z-50 transition-all duration-200 flex flex-col ${
            isMinimized ? "w-80 h-14" : "w-[92vw] sm:w-[440px] h-[600px] max-h-[85vh]"
          }`}
        >
          {/* Window Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-amber-400/20 bg-gradient-to-r from-[#4D0C0D] via-[#7A1315] to-[#630E10] text-white rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#7A1315] p-1.5 rounded-lg shadow-sm border border-amber-400/40">
                <Bot className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm">AI Procurement Assistant</span>
                  <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-amber-100/75">Mindanao State University - General Santos</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-amber-100/70 hover:text-white transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-amber-100/70 hover:text-white transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 shadow-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-[#7A1315] to-[#91191C] text-white rounded-tr-sm"
                          : "bg-white border border-red-950/10 text-gray-800 rounded-tl-sm shadow-2xs"
                      }`}
                    >
                      <ChatMessageContent content={msg.content} isUser={msg.role === "user"} />
                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center flex-wrap gap-1">
                          <span className="text-[10px] text-gray-500 font-medium">📚 Grounded in:</span>
                          {msg.sources.map((src, i) => (
                            <span key={i} className="text-[9px] font-medium bg-red-50 text-[#7A1315] border border-red-200/70 px-1.5 py-0.5 rounded">
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                      <p
                        className={`text-[10px] mt-1.5 text-right ${
                          msg.role === "user" ? "text-amber-200/80" : "text-gray-400"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-red-950/10 p-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-2xs">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#7A1315] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-[#91191C] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-gray-500">Searching verified procurement rules...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-4 py-2 bg-[#FAF8F5] border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Try:
                </span>
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-700 hover:text-[#7A1315] rounded-full transition-all duration-150 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-white border-t border-gray-100 rounded-b-2xl">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask about RA 12009, PR drafting, or tracking..."
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none transition-all text-xs sm:text-sm placeholder:text-gray-400"
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                    className="bg-gradient-to-r from-[#7A1315] to-[#91191C] hover:from-[#630E10] hover:to-[#7A1315] text-white px-3.5 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shadow-md shadow-red-950/20 border border-amber-400/20"
                    title="Send message"
                  >
                    <Send className="h-4 w-4 text-amber-300" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <button
                    onClick={clearChat}
                    className="text-[11px] text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear conversation
                  </button>
                  <span className="text-[10px] text-gray-400">
                    Republic Act No. 12009
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
