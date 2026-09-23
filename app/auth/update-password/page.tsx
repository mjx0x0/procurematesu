"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Lock, ArrowRight } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError(null);

    // ✅ Import Supabase dynamically (only on client side)
    const { supabase } = await import("@/lib/supabase/client");

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-bold text-[#4D002C]">Procuremate<span className="text-[#F5AB26]">SU</span></span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Update Password</h2>
          <p className="text-gray-600 mt-2">Enter your new password</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100">
          {success ? (
            <div className="text-center">
              <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-4">
                Password updated successfully!
              </div>
              <p className="text-gray-600">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046] outline-none transition-all"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046] outline-none transition-all"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7B0046] hover:bg-[#610037] text-white py-3 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}