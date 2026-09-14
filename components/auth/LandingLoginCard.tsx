"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight, Building2, CheckCircle, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";
import { motion, AnimatePresence } from "motion/react";

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
    if (authError === "account") setError("Your account is inactive or has not been approved for the MSU GenSan Procurement System.");
    if (authError === "unauthorized") setError("Please sign in to access the MSU GenSan Procurement System workspace.");
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
    let finalUser = userData;

    // Fallback: If client query returned null (e.g. due to iframe cookie isolation or RLS session latency),
    // verify and auto-provision the university account via the secure server-side endpoint.
    if (!finalUser && authData.session?.access_token) {
      try {
        const res = await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: authData.session.access_token }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.profile) {
            finalUser = json.profile;
          }
        }
      } catch (err) {
        console.error("Server profile verification failed:", err);
      }
    }

    if (!finalUser) {
      await supabase.auth.signOut();
      setError("Your university account is not provisioned for the MSU GenSan Procurement System. Please contact the administrator.");
      setLoading(false);
      return;
    }
    if (finalUser.status === "pending") {
      await supabase.auth.signOut();
      setError("Your registration is pending administrator approval. Please wait for an authorized administrator to approve your account.");
      setLoading(false);
      return;
    }
    if (finalUser.status === "rejected") {
      await supabase.auth.signOut();
      setError("Your registration was rejected. Please contact the administrator if you believe this is an error.");
      setLoading(false);
      return;
    }
    if (finalUser.is_active === false || (finalUser.status && finalUser.status !== "approved")) {
      await supabase.auth.signOut();
      setError("Your account is inactive or not approved for the MSU GenSan Procurement System. Please contact the administrator.");
      setLoading(false);
      return;
    }

    setRedirecting(true);
    setLoading(false);
    router.replace(finalUser.role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <div className={`w-full transition-all duration-500 ${redirecting ? "scale-[0.98] opacity-0" : "animate-fade-in-up"}`}>
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_24px_60px_rgba(40,4,6,0.18)] backdrop-blur-sm">
        <div className="h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#D4AF37] to-[#7A1315]" />
        <div className="border-b border-stone-100 px-6 pb-4 pt-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#B88E13]">Institutional Access</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#4D0C0D]">Welcome back</h2>
              <p className="mt-1 text-xs text-stone-500">Sign in to the MSU GenSan Procurement System.</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A1315] to-[#4D0C0D] shadow-sm border border-[#D4AF37]/25">
              <Lock className="h-5 w-5 text-amber-200" />
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 p-6 sm:p-7">
          {successMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="landing-email" className="block text-xs font-bold text-stone-700">
              University Email Address
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 z-10 flex h-5 w-5 items-center justify-center text-stone-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="landing-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@msugensan.edu.ph"
                autoComplete="email"
                style={{ paddingLeft: "2.85rem", paddingRight: "1rem" }}
                className="w-full !min-h-[44px] py-2.5 !pl-11 !pr-4 text-sm rounded-xl border-stone-200 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315]"
                required
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-stone-500">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-[#7A1315]" />
              Official @msugensan.edu.ph accounts only.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="landing-password" className="block text-xs font-bold text-stone-700">
                Password
              </label>
              <Link href="/auth/forgot-password" className="text-xs font-bold text-[#7A1315] hover:text-[#4D0C0D]">
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 z-10 flex h-5 w-5 items-center justify-center text-stone-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="landing-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ paddingLeft: "2.85rem", paddingRight: "2.85rem" }}
                className="w-full !min-h-[44px] py-2.5 !pl-11 !pr-11 text-sm rounded-xl border-stone-200 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || redirecting}
            className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] hover:from-[#650709] hover:to-[#7A1315] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-[#D4AF37]/35 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in...
              </>
            ) : (
              <>
                Sign In to Portal <ArrowRight className="h-4 w-4 text-amber-300" />
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.14em] text-stone-400 pt-1">
            <div className="h-px flex-1 bg-stone-200" />
            <span>ACCOUNT ACCESS</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3">
            <div className="flex min-w-0 items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E13]" />
              <p className="text-xs leading-relaxed text-stone-600">
                <span className="font-bold text-stone-700">New account?</span> Registration requires administrator approval.
              </p>
            </div>
            <Link href="/auth/signup" className="shrink-0 text-xs font-extrabold text-[#7A1315] hover:text-[#4D0C0D] underline decoration-amber-400 underline-offset-2">
              Register
            </Link>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {redirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAF8F5]/98 backdrop-blur-md px-4 selection:bg-[#7A1315] selection:text-amber-200"
          >
            {/* Decorative top accent */}
            <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#D4AF37] to-[#7A1315]" />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center max-w-sm"
            >
              {/* Pulsing University Seal with Gold Aura */}
              <div className="relative mb-6">
                <div className="absolute -inset-2 rounded-full bg-[#D4AF37]/25 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-3 shadow-[0_20px_40px_rgba(77,12,13,0.18)] border border-[#D4AF37]/40">
                  <MsuLogo size={56} />
                </div>
              </div>

              {/* Text */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4D0C0D]/10 text-[#4D0C0D] text-[10px] font-black tracking-wider uppercase mb-2">
                <Sparkles className="h-3 w-3 text-[#B88E13]" />
                Institutional Authentication
              </div>
              <h3 className="text-xl font-black text-[#4D0C0D] tracking-tight">
                Authenticating Session
              </h3>
              <p className="mt-1 text-xs text-stone-500 font-medium leading-relaxed">
                Loading your authorized procurement workspace and permissions...
              </p>

              {/* Shimmering Gold Progress Track */}
              <div className="mt-6 w-56 h-1.5 bg-stone-200/90 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-[#7A1315] via-[#D4AF37] to-[#7A1315] rounded-full animate-progress-indeterminate" />
              </div>

              <p className="mt-5 text-[9px] font-extrabold text-stone-400 uppercase tracking-widest">
                Mindanao State University - General Santos
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
