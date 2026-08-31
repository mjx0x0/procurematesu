"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  FileText, Send, Bot, User, Loader2, 
  ArrowLeft, MessageSquare, Sparkles, 
  Clock, Trash2, Copy, CheckCircle
} from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export default function ChatbotDashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check authentication on load
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);
      setIsAuthenticated(true);

      // Add welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "👋 Hello! I'm Isko BidDo, your procurement assistant. I can help you with:\n\n• Questions about RA 12009 and procurement rules\n• Purchase Request (PR) status inquiries\n• Drafting PRs with AI slot-filling\n• Step-by-step procurement guidance\n\nHow can I help you today?",
          timestamp: new Date(),
        },
      ]);
    };
    checkAuth();
  }, [router]);

  const handleSend = async () => {
    if (!input.trim() || loading || !isAuthenticated) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Add loading message
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
          message: userMessage.content,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      // Replace loading message with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { 
              ...msg, 
              content: data.response || 'Sorry, I could not process your request.',
              isLoading: false 
            }
          : msg
      ));

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { 
              ...msg, 
              content: '❌ An error occurred. Please try again.',
              isLoading: false 
            }
          : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
        content: "👋 Hello! I'm Isko BidDo, your procurement assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Isko BidDo</span>
              <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AI Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearChat}
              className="text-gray-500 hover:text-red-600 transition-colors text-sm flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Clear Chat
            </button>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse delay-100">●</span>
                      <span className="animate-pulse delay-200">●</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] opacity-70">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                        {msg.role === 'assistant' && !msg.isLoading && (
                          <button
                            onClick={() => copyMessage(msg.content)}
                            className="text-[10px] opacity-50 hover:opacity-100 transition-opacity"
                          >
                            <Copy className="h-3 w-3" />
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

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white/50">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about procurement, RA 12009, or PR status..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/70"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Send
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Ask about RA 12009, procurement procedures, or get help with your Purchase Requests
            </p>
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {[
            "What is RA 12009?",
            "How does Small Value Procurement work?",
            "What are the procurement modes?",
            "Help me draft a PR",
            "What is the SVP threshold?",
            "Explain the bidding process",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setInput(suggestion);
                inputRef.current?.focus();
              }}
              className="px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full text-xs text-gray-600 hover:bg-white hover:shadow-md transition-all border border-gray-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}