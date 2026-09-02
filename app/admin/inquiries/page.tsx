"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  FileText, LogOut, User, ArrowLeft, MessageSquare,
  Loader2, Eye, Search, Calendar
} from "lucide-react";

interface Inquiry {
  id: string;
  user_id: string;
  user_name: string;
  user_department: string;
  user_message: string;
  bot_response: string;
  inquiry_type: string;
  created_at: string;
}

export default function AdminInquiriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
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
    };
    checkAdmin();
  }, [router]);

  const loadInquiries = async () => {
    try {
      const { data } = await supabase
        .from("monitor_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setInquiries(data);
      }
    } catch (err) {
      console.error("Error loading inquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const filteredInquiries = inquiries.filter(inq =>
    inq.user_message.toLowerCase().includes(search.toLowerCase()) ||
    inq.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    inq.user_department?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("app/admin")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Monitor Chatbot Activities</span>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-purple-600" />
              Chatbot Inquiry Log
            </h1>
            <p className="text-gray-600 text-sm">Monitor all user interactions with Isko BidDo</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredInquiries.length} total inquiries
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, message, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Inquiries List */}
        <div className="space-y-4">
          {filteredInquiries.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No inquiries yet</h3>
              <p className="text-gray-500">Users haven't asked any questions yet.</p>
            </div>
          ) : (
            filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-purple-200 transition-all"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{inq.user_name || "Unknown User"}</span>
                      {inq.user_department && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {inq.user_department}
                        </span>
                      )}
                      {inq.inquiry_type && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          {inq.inquiry_type}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(inq.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      <span className="text-gray-400">Q:</span> {inq.user_message}
                    </p>
                    {inq.bot_response && (
                      <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                        <span className="text-gray-400">A:</span> {inq.bot_response}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedInquiry(inq);
                      setShowDetail(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showDetail && selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Inquiry Details</h3>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">User</p>
                  <p className="font-medium">{selectedInquiry.user_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="font-medium">{selectedInquiry.user_department || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium">{selectedInquiry.inquiry_type || "General"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium">{new Date(selectedInquiry.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 mb-1">User Question</p>
                <div className="bg-blue-50 rounded-lg p-4 text-gray-800">
                  {selectedInquiry.user_message}
                </div>
              </div>

              {selectedInquiry.bot_response && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bot Response</p>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">
                    {selectedInquiry.bot_response}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 flex justify-end">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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