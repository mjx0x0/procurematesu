"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight, Building2, CheckCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LandingLoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }
    if (!cleanEmail.endsWith("@msugensan.edu.ph")) {
      setError("Only @msugensan.edu.ph email addresses are allowed.");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (authError || !authData.user) {
      let msg = authError?.message || "Unable to sign in.";
      if (msg.includes("Invalid login credentials")) msg = "The email or password you entered is incorrect. Please try again.";
      setError(msg);
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, is_active, status")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (userError) {
      console.error("Login profile lookup failed:", userError);
      await supabase.auth.signOut();
      setError("Unable to verify your account. Please contact the administrator.");
      setLoading(false);
      return;
    }
    if (!userData) {
      await supabase.auth.signOut();
      setError("Your university account is not provisioned for ProcuremateSU. Please contact the administrator.");
      setLoading(false);
      return;
    }
    if (userData.status === "pending") {
      await supabase.auth.signOut();
      setError("Your registration is pending administrator approval. Please wait for an authorized administrator to approve your account.");
      setLoading(false);
      return;
    }
    if (userData.status === "rejected") {
      await supabase.auth.signOut();
      setError("Your ProcuremateSU registration was rejected. Please contact the administrator if you believe this is an error.");
      setLoading(false);
      return;
    }
    if (userData.is_active === false || userData.status !== "approved") {
      await supabase.auth.signOut();
      setError("Your account is inactive or not approved for ProcuremateSU. Please contact the administrator.");
      setLoading(false);
      return;
    }

    setRedirecting(true);
    setLoading(false);
    router.replace(userData.role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <div className={`w-full transition-all duration-500 ${redirecting ? "scale-[0.98] opacity-0" : "animate-fade-in-up"}`}>
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-stone-900/10 border border-stone-200 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#B88E13] to-[#7A1315]" />
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-stone-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B88E13]">Institutional Access</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#4D0C0D]">Welcome back</h2>
              <p className="text-xs text-stone-500 mt-1">Sign in to your ProcuremateSU workspace.</p>
            </div>
            <div className="h-11 w-11 shrink-0 rounded-xl bg-[#4D0C0D] flex items-center justify-center shadow-sm">
              <Lock className="h-5 w-5 text-amber-200" />
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">University Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@msugensan.edu.ph"
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 text-sm border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/15 focus:border-[#7A1315] outline-none transition-all"
                required
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1.5 flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-[#7A1315]" />
              Only official @msugensan.edu.ph accounts are accepted.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 text-sm border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/15 focus:border-[#7A1315] outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#7A1315] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-0.5">
            <Link href="/auth/signup" className="text-[#7A1315] hover:text-[#4D0C0D] font-bold transition-colors">Create an account</Link>
            <Link href="/auth/forgot-password" className="text-stone-500 hover:text-[#7A1315] font-semibold transition-colors">Forgot password?</Link>
          </div>

          <button
            type="submit"
            disabled={loading || redirecting}
            className="w-full bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] hover:from-[#630E10] hover:to-[#7A1315] text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-red-950/20 hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0 border border-amber-400/30"
          >
            {loading ? (
              <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Signing in...</>
            ) : (
              <>Sign In to Portal <ArrowRight className="h-4 w-4 text-amber-300" /></>
            )}
          </button>
        </form>

        <div className="px-6 sm:px-8 pb-6">
          <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 text-center">
            <p className="text-[10px] leading-4 text-stone-500">
              <span className="font-bold text-stone-700">New account?</span> Registration is available to MSU-Gensan institutional users and requires administrator approval.
            </p>
          </div>
        </div>
      </div>

      {redirecting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF8F5]/95 backdrop-blur-sm animate-[fadeIn_250ms_ease-out]">
          <div className="flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center mb-5">
              <span className="absolute h-20 w-20 rounded-full border border-[#B88E13]/30 animate-ping" />
              <span className="absolute h-16 w-16 rounded-full border-2 border-[#7A1315]/15 border-t-[#7A1315] animate-spin" />
              <div className="relative h-12 w-12 rounded-full bg-white shadow-md border border-stone-200 flex items-center justify-center"><Lock className="h-5 w-5 text-[#7A1315]" /></div>
            </div>
            <p className="text-sm font-bold text-[#4D0C0D] tracking-wide">Signing you in</p>
            <p className="text-xs text-stone-500 mt-1">Preparing your ProcuremateSU workspace...</p>
          </div>
        </div>
      )}
    </div>
  );
}
