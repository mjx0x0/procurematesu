"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  FileText,
  LogOut,
  User,
  Loader2,
  Search,
  ChevronDown,
  Eye,
  MessageSquare,
  Calendar,
  Filter,
  X,
  Download,
  ArrowLeft,
} from "lucide-react";

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
}

export default function InquiriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
          router.push("/auth/login");
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

        setUser(user);
        await loadInquiries();
      } catch (err) {
        console.error("Admin check error:", err);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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
      general: "bg-red-50 text-[#7A1315] border border-red-200/60",
      pr_status: "bg-amber-50 text-amber-800 border border-amber-200/60",
      ra_12009: "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
      slot_fill: "bg-orange-50 text-orange-800 border border-orange-200/60",
    };
    return colors[type] || "bg-stone-100 text-stone-600";
  };

  const exportCSV = () => {
    const headers = [
      "User",
      "Department",
      "PR No.",
      "Question",
      "Response",
      "Type",
      "Date",
    ];
    const rows = filteredInquiries.map((i) => [
      i.user_name || "N/A",
      i.user_department || "N/A",
      i.pr_no || "N/A",
      i.user_message,
      i.bot_response,
      i.inquiry_type || "general",
      formatDate(i.created_at),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inquiries_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#7A1315] mx-auto" />
          <p className="mt-4 text-stone-600 font-medium">Loading inquiries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl text-stone-500 hover:text-[#7A1315] hover:bg-stone-100 transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-[#4D0C0D] p-2 rounded-xl text-amber-300 shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <b className="text-xl font-black text-[#4D0C0D]">
                  Inquiry <span className="text-[#B88E13]">Monitoring</span>
                </b>
                <span className="text-[11px] bg-red-50 text-[#7A1315] border border-red-200/80 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Admin Tool
                </span>
              </div>
              <p className="text-[10px] text-stone-500">Isko BidDo assistant interaction logs & procurement knowledge inquiries</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-600 hidden sm:inline font-medium">
              <User className="h-3.5 w-3.5 inline mr-1 text-[#7A1315]" />
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-stone-400 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-stone-100"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#4D0C0D]">Chatbot & Helpdesk Logs</h1>
            <p className="text-sm text-stone-600 mt-1">
              <b>{filteredInquiries.length}</b> logged inquiries across user sessions.
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="ui-button bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 text-xs py-2 px-3.5 shadow-xs"
            disabled={filteredInquiries.length === 0}
          >
            <Download className="h-4 w-4 text-[#7A1315]" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="ui-card p-4 mb-6">
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
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="ui-select text-sm py-2.5 px-3 min-w-[150px]"
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
                  className="ui-input text-sm py-2 px-3"
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
                      User Question
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
                      <td className="px-5 py-4 text-sm font-bold text-[#7A1315] whitespace-nowrap">
                        {inquiry.pr_no || "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-stone-500 whitespace-nowrap">
                        {formatDate(inquiry.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setShowDetailModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#7A1315] hover:text-[#4D0C0D] px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[#4D0C0D]">Inquiry Detail</h3>
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
              <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
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
                  <p className="font-bold text-[#7A1315] text-sm mt-0.5">{selectedInquiry.pr_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Timestamp</p>
                  <p className="font-medium text-stone-700 text-xs mt-0.5">{formatDate(selectedInquiry.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-stone-500 font-bold mb-1.5">User Prompt</p>
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-800 whitespace-pre-wrap font-medium">
                  {selectedInquiry.user_message}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#B88E13] font-bold mb-1.5">Isko BidDo AI Response</p>
                <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/80 text-sm text-stone-900 whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.bot_response || "No response recorded"}
                </div>
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