"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight, Building2, CheckCircle, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

export default function LandingLoginCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const authError = params.get("error");
    if (success) setSuccessMessage(success);
    if (authError === "account") setError("Your account is inactive or has not been approved for ProcuremateSU.");
    if (authError === "unauthorized") setError("Please sign in to access the ProcuremateSU workspace.");
    if (authError === "configuration") setError("The authentication service is temporarily unavailable. Please contact the administrator.");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter your university email and password.");
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

    const { data: userData, error: userError } = await supabase.from("users").select("role, is_active, status").eq("id", authData.user.id).maybeSingle();
    if (userError) {
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
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_55px_rgba(53,7,8,0.10)]">
        <div className="h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#B88E13] to-[#7A1315]" />
        <div className="border-b border-stone-100 px-6 pb-5 pt-6 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B88E13]">Institutional Access</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#4D0C0D]">Welcome back</h2>
              <p className="mt-1 text-xs text-stone-500">Sign in to your ProcuremateSU workspace.</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4D0C0D] shadow-sm">
              <Lock className="h-5 w-5 text-amber-200" />
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 p-6 sm:p-8">
          {successMessage && <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{successMessage}</span></div>}
          {error && <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span>{error}</span></div>}

          <div className="space-y-1.5">
            <label htmlFor="landing-email" className="block text-xs font-bold text-stone-700">University Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input id="landing-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@msugensan.edu.ph" autoComplete="email" className="w-full py-3 pl-10 pr-4 text-sm" required />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] leading-5 text-stone-500"><Building2 className="h-3 w-3 shrink-0 text-[#7A1315]" />Only official @msugensan.edu.ph accounts are accepted.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="landing-password" className="block text-xs font-bold text-stone-700">Password</label>
              <Link href="/auth/forgot-password" className="text-[11px] font-bold text-[#7A1315] hover:text-[#4D0C0D]">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input id="landing-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" className="w-full py-3 pl-10 pr-11 text-sm" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>

          <button type="submit" disabled={loading || redirecting} className="ui-button ui-button-primary w-full py-3.5 text-sm">
            {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Signing in...</> : <>Sign In to Portal <ArrowRight className="h-4 w-4 text-amber-300" /></>}
          </button>

          <div className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.14em] text-stone-400"><div className="h-px flex-1 bg-stone-200" /><span>ACCOUNT ACCESS</span><div className="h-px flex-1 bg-stone-200" /></div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3">
            <div className="flex min-w-0 items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E13]" /><p className="text-[11px] leading-5 text-stone-600"><span className="font-bold text-stone-700">New account?</span> Registration requires administrator approval.</p></div>
            <Link href="/auth/signup" className="shrink-0 text-xs font-extrabold text-[#7A1315] hover:text-[#4D0C0D]">Register</Link>
          </div>
        </form>
      </div>

      {redirecting && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF8F5]/95 backdrop-blur-sm"><div className="text-center"><div className="mx-auto h-12 w-12 rounded-full border-2 border-[#7A1315]/15 border-t-[#7A1315] animate-spin" /><p className="mt-4 text-sm font-bold text-[#4D0C0D]">Signing you in</p><p className="mt-1 text-xs text-stone-500">Preparing your ProcuremateSU workspace...</p></div></div>}
    </div>
  );
}
