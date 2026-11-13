"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase, isStaleRefreshTokenError } from "@/lib/supabase/client";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import AdminPRNotificationPopover from "@/components/AdminPRNotificationPopover";
import LoadingScreen from "@/components/LoadingScreen";
import { User, Search, Eye, MessageSquare, Filter, X } from "lucide-react";

interface Inquiry {
  id: string;
  user_id: string;
  user_name: string;
  user_department: string;
  pr_no: string;
  user_message: string;
  bot_response: string;
  inquiry_type: string;
  created_at: string;
  updated_at: string;
  session_id?: string | null;
}

interface ConversationTurn {
  id: string;
  sender: "user" | "ai" | "assistant";
  content: string;
  created_at: string;
}

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);

  // Check admin and load data
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
        }
        if (!user) {
          router.push("/");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userData?.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        await loadInquiries();
      } catch (err) {
        if (!isStaleRefreshTokenError(err)) {
          console.error("Admin check error:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  const loadInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from("monitor_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
      setFilteredInquiries(data || []);
    } catch (err) {
      console.error("Error loading inquiries:", err);
    }
  };

  const openConversation = async (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setShowDetailModal(true);
    setConversationTurns([]);
    if (!inquiry.session_id) return;

    setConversationLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,sender,content,created_at")
        .eq("session_id", inquiry.session_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setConversationTurns((data || []) as ConversationTurn[]);
    } catch (err) {
      console.error("Error loading complete conversation:", err);
      setConversationTurns([]);
    } finally {
      setConversationLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...inquiries];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.user_message?.toLowerCase().includes(term) ||
          i.bot_response?.toLowerCase().includes(term) ||
          i.user_name?.toLowerCase().includes(term) ||
          i.pr_no?.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((i) => i.inquiry_type === typeFilter);
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter((i) => {
        const inquiryDate = new Date(i.created_at);
        return (
          inquiryDate.getFullYear() === filterDate.getFullYear() &&
          inquiryDate.getMonth() === filterDate.getMonth() &&
          inquiryDate.getDate() === filterDate.getDate()
        );
      });
    }

    setFilteredInquiries(filtered);
  }, [searchTerm, typeFilter, dateFilter, inquiries]);

const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      general: "bg-red-50 text-[#7B0046] border border-red-200/60",
      pr_status: "bg-amber-50 text-amber-800 border border-amber-200/60",
      ra_12009: "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
      slot_fill: "bg-orange-50 text-orange-800 border border-orange-200/60",
    };
    return colors[type] || "bg-stone-100 text-stone-600";
  };

  if (loading) return <LoadingScreen label="Loading inquiries..." />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      {/* Navigation */}
      <SystemPageHeader
        titlePrimary="Inquiry"
        titleAccent="Monitoring"
        icon={MessageSquare}
        backHref="/admin"
        roleLabel="Administrator"
        containerClassName="max-w-7xl px-4 sm:px-6"
        showControlsDivider
      >
        <AdminPRNotificationPopover />
      </SystemPageHeader>

      <div className="max-w-7xl mx-auto px-3.5 py-4 sm:px-6 sm:py-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[#4D002C]">Chatbot & Helpdesk Logs</h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              <b>{filteredInquiries.length}</b> conversation sessions recorded.
            </p>
          </div>

        </div>

        {/* Filters */}
        <div className="ui-card p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by question, response, user, or PR number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ui-input w-full pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:flex sm:flex-nowrap gap-2 sm:gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="ui-select w-full sm:w-auto text-sm py-2.5 px-3 min-w-0 sm:min-w-[150px]"
              >
                <option value="all">All Inquiry Types</option>
                <option value="general">General</option>
                <option value="pr_status">PR Status</option>
                <option value="ra_12009">RA 12009</option>
                <option value="slot_fill">Slot Fill</option>
              </select>
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="ui-input w-full sm:w-auto text-sm py-2 px-3"
                  title="Filter by date"
                />
              </div>
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                  title="Clear date filter"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="ui-card overflow-hidden">
          {filteredInquiries.length === 0 ? (
            <div className="p-12 text-center text-stone-500">
              <MessageSquare className="h-10 w-10 mx-auto text-stone-300 mb-2" />
              <p className="font-semibold">No inquiries found.</p>
              <p className="text-xs text-stone-400 mt-1">Inquiries submitted to the chatbot will be logged here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                      Requester
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                      Conversation Preview
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                      Category
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                      PR #
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                      Timestamp
                    </th>
                    <th className="px-5 py-3.5 text-right text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredInquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-stone-900">
                          {inquiry.user_name || "N/A"}
                        </div>
                        <div className="text-xs text-stone-500">
                          {inquiry.user_department || "Department not set"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-700 max-w-sm truncate font-medium">
                        {inquiry.user_message}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getTypeBadge(
                            inquiry.inquiry_type || "general"
                          )}`}
                        >
                          {inquiry.inquiry_type || "general"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-[#7B0046] whitespace-nowrap">
                        {inquiry.pr_no || "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-stone-500 whitespace-nowrap">
                        {formatDate(inquiry.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => void openConversation(inquiry)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#7B0046] hover:text-[#4D002C] px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedInquiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-3.5 sm:p-6 border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#4D002C]">Conversation Details</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getTypeBadge(
                    selectedInquiry.inquiry_type || "general"
                  )}`}
                >
                  {selectedInquiry.inquiry_type || "general"}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">User</p>
                  <p className="font-bold text-stone-900 text-sm mt-0.5">{selectedInquiry.user_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Department</p>
                  <p className="font-bold text-stone-900 text-sm mt-0.5">{selectedInquiry.user_department || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">PR Number</p>
                  <p className="font-bold text-[#7B0046] text-sm mt-0.5">{selectedInquiry.pr_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Timestamp</p>
                  <p className="font-medium text-stone-700 text-xs mt-0.5">{formatDate(selectedInquiry.created_at)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">Full Conversation</p>
                  {conversationTurns.length > 0 && (
                    <span className="text-[10px] text-stone-400">{Math.ceil(conversationTurns.filter((turn) => turn.sender === "user").length)} user messages</span>
                  )}
                </div>
                {conversationLoading ? (
                  <div className="p-6 text-center text-xs text-stone-500">Loading complete conversation...</div>
                ) : conversationTurns.length > 0 ? (
                  <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                    {conversationTurns.map((turn) => {
                      const isUser = turn.sender === "user";
                      return (
                        <div key={turn.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                          <div className={`max-w-[92%] rounded-xl border p-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${isUser ? "bg-stone-50 border-stone-200 text-stone-800" : "bg-amber-50/40 border-amber-200/80 text-stone-900"}`}>
                            <p className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isUser ? "text-stone-500" : "text-[#C27803]"}`}>
                              {isUser ? "User" : "Gab AI"}
                            </p>
                            {turn.content}
                            <p className="text-[10px] text-stone-400 mt-2 text-right">{formatDate(turn.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-stone-500 font-bold mb-1.5">User Message</p>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 whitespace-pre-wrap font-medium">{selectedInquiry.user_message}</div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#C27803] font-bold mb-1.5">Gab AI Reply</p>
                      <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/80 text-xs sm:text-sm text-stone-900 whitespace-pre-wrap leading-relaxed">{selectedInquiry.bot_response || "No response recorded"}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}