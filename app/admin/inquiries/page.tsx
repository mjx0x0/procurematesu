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
        const { data: { user } } = await supabase.auth.getUser();
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
      general: "bg-blue-100 text-blue-600",
      pr_status: "bg-purple-100 text-purple-600",
      ra_12009: "bg-green-100 text-green-600",
      slot_fill: "bg-orange-100 text-orange-600",
    };
    return colors[type] || "bg-gray-100 text-gray-600";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading inquiries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Inquiry Monitoring</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              <User className="h-4 w-4 inline mr-1" />
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chatbot Inquiries</h1>
            <p className="text-gray-600 mt-1">
              {filteredInquiries.length} inquiries found
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="bg-white/70 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-white transition-colors flex items-center gap-2 border border-gray-200"
            disabled={filteredInquiries.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by question, response, user, or PR number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/70"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/70"
                >
                  <option value="all">All Types</option>
                  <option value="general">General</option>
                  <option value="pr_status">PR Status</option>
                  <option value="ra_12009">RA 12009</option>
                  <option value="slot_fill">Slot Fill</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/70"
                />
              </div>
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 overflow-hidden">
          {filteredInquiries.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No inquiries found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PR #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {inquiry.user_name || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {inquiry.user_department || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {inquiry.user_message}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(
                            inquiry.inquiry_type || "general"
                          )}`}
                        >
                          {inquiry.inquiry_type || "general"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {inquiry.pr_no || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(inquiry.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Inquiry Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium">{selectedInquiry.user_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{selectedInquiry.user_department || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PR Number</p>
                  <p className="font-medium">{selectedInquiry.pr_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(
                      selectedInquiry.inquiry_type || "general"
                    )}`}
                  >
                    {selectedInquiry.inquiry_type || "general"}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(selectedInquiry.created_at)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Question</p>
                  <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedInquiry.user_message}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Response</p>
                  <p className="p-3 bg-blue-50 rounded-lg whitespace-pre-wrap">
                    {selectedInquiry.bot_response || "No response recorded"}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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