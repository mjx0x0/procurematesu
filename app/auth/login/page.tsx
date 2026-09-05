"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { MsuLogo } from "@/components/msu-logo";
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    if (success) setSuccessMessage(success);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError) {
      let msg = authError.message;
      if (msg.includes("Email not confirmed")) {
        msg = "Your email address has not been confirmed. Please check your inbox or contact the admin.";
      } else if (msg.includes("Invalid login credentials")) {
        msg = "The email or password you entered is incorrect. Please try again.";
      } else if (msg.includes("User not found")) {
        msg = "No account found with this email. Please contact the admin.";
      }
      setError(msg);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("User not found. Please try again.");
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("Login profile lookup failed:", userError);
      if (userError.code === "PGRST116") {
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            role: "end_user",
            is_active: true,
          });

        if (insertError) {
          console.error("Failed to create user record:", insertError);
          await supabase.auth.signOut();
          setError("Your account profile could not be created. Please contact the administrator.");
          setLoading(false);
          return;
        }

        router.push("/dashboard");
        return;
      }

      await supabase.auth.signOut();
      setError("Unable to verify your account. Please try again or contact the administrator.");
      setLoading(false);
      return;
    }

    if (userData?.is_active === false) {
      await supabase.auth.signOut();
      setError("Your account is inactive. Please contact the administrator.");
      setLoading(false);
      return;
    }

    if (userData?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 py-8">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105 mb-2" title="Return to Home">
            <MsuLogo size={96} />
          </Link>
          <div className="mt-2">
            <h1 className="text-2xl font-extrabold text-[#4D0C0D] tracking-tight">
              Procuremate<span className="text-[#B88E13]">SU</span>
            </h1>
            <p className="text-xs font-semibold text-[#7A1315] tracking-wide uppercase mt-0.5">
              Mindanao State University - General Santos
            </p>
          </div>
          <p className="text-xs text-stone-600 mt-2">Sign in with your official university credentials</p>
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-xl border border-stone-200/90">
          <form onSubmit={handleLogin} className="space-y-5">
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">University Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@msugensan.edu.ph" className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none transition-all bg-white" required />
              </div>
              <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                <Building2 className="h-3 w-3 inline text-[#7A1315]" />
                Use your official @msugensan.edu.ph email
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your account password" className="w-full pl-9 pr-11 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#7A1315] focus:border-transparent outline-none transition-all bg-white" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="rounded border-stone-300 text-[#7A1315] focus:ring-[#7A1315]" />
                <span className="text-stone-600">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-[#7A1315] hover:text-[#4D0C0D] font-semibold">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] hover:from-[#630E10] hover:to-[#7A1315] text-white py-3 rounded-xl font-semibold text-sm shadow-md shadow-red-950/20 hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 border border-amber-400/30">
              {loading ? (
                <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Authenticating...</>
              ) : (
                <><span>Sign In to Portal</span><ArrowRight className="h-4 w-4 text-amber-300" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
