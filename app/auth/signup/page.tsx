"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MsuLogo } from "@/components/msu-logo";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Check,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@msugensan\.edu\.ph$/i;

function validatePassword(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Live password validation checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isEmailValidDomain = email.trim().toLowerCase().endsWith("@msugensan.edu.ph");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (cleanName.length < 2) {
      setError("Please enter your complete name.");
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("Only @msugensan.edu.ph institutional email addresses are allowed.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: cleanName, email: cleanEmail, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result?.error || "Unable to create the account. Please try again.");
        return;
      }
      setRegisteredEmail(cleanEmail);
      setSuccess(true);
    } catch (err) {
      console.error("Registration failed:", err);
      setError("Unable to create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FAF8F5] px-4 py-8 sm:py-12 flex flex-col justify-center items-center selection:bg-[#7A1315] selection:text-amber-200">
      {/* Top institutional gold/maroon accent ribbon */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#D4AF37] to-[#7A1315] z-50" />

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[42rem] rounded-full bg-gradient-to-b from-[#7A1315]/10 via-[#D4AF37]/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#D4AF37]/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl"
      >
        <AnimatePresence mode="wait">
          {success ? (
            /* Success confirmation card */
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-[#D4AF37]/35 bg-white p-8 sm:p-10 shadow-[0_24px_60px_rgba(77,12,13,0.12)] text-center relative"
            >
              <div className="h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#D4AF37] to-[#7A1315] absolute top-0 left-0 right-0" />
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 border border-emerald-200 shadow-sm relative">
                <MsuLogo size={52} />
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md border-2 border-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                Registration Received
              </div>

              <h2 className="text-2xl font-black text-[#4D0C0D] tracking-tight">
                Account Successfully Created
              </h2>

              <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                An end-user account for <strong className="text-stone-900 font-bold">{registeredEmail}</strong> has been registered in the MSU GenSan Procurement Management System.
              </p>

              {/* Approval status banner */}
              <div className="mt-6 text-left rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300/60">
                    <Clock className="h-5 w-5 text-[#9A7205]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#7A1315]">
                      Pending Administrative Approval
                    </h3>
                    <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                      In accordance with university procurement guidelines, all end-user accounts must be verified and approved by the <strong>Procurement Management Office (PMO)</strong> before accessing the portal.
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-stone-500">
                      • No further email verification link is needed.<br />
                      • You will be able to sign in as soon as an administrator activates your profile.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all border border-[#D4AF37]/40 hover:brightness-105"
                >
                  Return to Landing Page & Sign In <ArrowRight className="h-4 w-4 text-amber-300" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-100 transition-all"
                >
                  Return to Home
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Registration Form with University Split-Hero Card */
            <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-[0_24px_60px_rgba(40,4,6,0.14)] grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[380px_1fr]">
              {/* Left Institutional Showcase Column */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#4D0C0D] via-[#610E11] to-[#380406] p-7 sm:p-9 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#D4AF37]/20">
                {/* Decorative university watermark and gold aura */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#D4AF37]/15 blur-2xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#8B1518]/30 blur-2xl" />

                <div>
                  <Link href="/" className="inline-flex items-center gap-3 group">
                    <div className="transition-transform group-hover:scale-105">
                      <MsuLogo size={54} />
                    </div>
                    <div>
                      <div className="text-sm font-black tracking-tight text-white group-hover:text-[#F0C83F] transition-colors">
                        MSU GenSan <span className="text-[#F0C83F]">Procurement</span>
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200/70">
                        Institutional Portal
                      </div>
                    </div>
                  </Link>

                  <div className="mt-8">
                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                      End-User <span className="text-[#F0C83F]">Registration</span>
                    </h1>
                  </div>

                  {/* 3-Step Verification Guide */}
                  <div className="mt-7 space-y-3.5 border-t border-white/15 pt-6">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-200/80">
                      Onboarding Workflow
                    </p>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0C83F]/20 text-[#F0C83F] text-[10px] font-black border border-[#F0C83F]/40">
                        1
                      </div>
                      <div className="text-xs text-white/85">
                        <span className="font-bold text-white">Register Credentials</span>
                        <p className="text-[11px] text-white/70">Enter your name and @msugensan.edu.ph email.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0C83F]/20 text-[#F0C83F] text-[10px] font-black border border-[#F0C83F]/40">
                        2
                      </div>
                      <div className="text-xs text-white/85">
                        <span className="font-bold text-white">PMO Administrator Review</span>
                        <p className="text-[11px] text-white/70">Procurement office validates requisitioner status.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0C83F]/20 text-[#F0C83F] text-[10px] font-black border border-[#F0C83F]/40">
                        3
                      </div>
                      <div className="text-xs text-white/85">
                        <span className="font-bold text-white">Workspace Sign In</span>
                        <p className="text-[11px] text-white/70">Access PR preparation, tracking, and logs.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer note */}
                <div className="mt-8 pt-4 border-t border-white/10 text-[10px] text-white/60 flex items-center justify-between">
                  <span>Mindanao State University</span>
                  <span className="text-[#F0C83F] font-bold">RA 12009 Compliant</span>
                </div>
              </div>

              {/* Right Form Column */}
              <div className="p-6 sm:p-8 lg:p-9 flex flex-col justify-between">
                <div>
                  <div className="border-b border-stone-100 pb-4 mb-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B88E13]">
                      Institutional Credentials
                    </p>
                    <h2 className="text-xl font-black text-[#4D0C0D] tracking-tight">
                      Create your account
                    </h2>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* Error Banner */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          role="alert"
                          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 leading-relaxed"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                          <span className="flex-1">{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700">
                        Complete Name
                      </label>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 z-10 flex h-5 w-5 items-center justify-center text-stone-400">
                          <User className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Juan D. Dela Cruz"
                          autoComplete="name"
                          style={{ paddingLeft: "2.85rem", paddingRight: "1rem" }}
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-4 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] transition-all bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* University Email Address */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-stone-700">
                          Institutional Email Address
                        </label>
                        {isEmailValidDomain && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Check className="h-3 w-3" /> Valid Domain
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 z-10 flex h-5 w-5 items-center justify-center text-stone-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="username@msugensan.edu.ph"
                          autoComplete="email"
                          style={{ paddingLeft: "2.85rem", paddingRight: "1rem" }}
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-4 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] transition-all bg-white"
                          required
                        />
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <Building2 className="h-3 w-3 text-[#7A1315] shrink-0" />
                        Must be your official <strong className="text-stone-700">@msugensan.edu.ph</strong> account.
                      </p>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-stone-700">
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 z-10 flex h-5 w-5 items-center justify-center text-stone-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a strong password"
                          autoComplete="new-password"
                          style={{ paddingLeft: "2.85rem", paddingRight: "2.85rem" }}
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-11 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] transition-all bg-white"
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

                      {/* Live criteria checklist */}
                      {password.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-[10px]">
                          <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700 font-bold" : "text-stone-500"}`}>
                            <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${hasMinLength ? "bg-emerald-600 text-white" : "bg-stone-200"}`}>
                              {hasMinLength && <Check className="h-2.5 w-2.5" />}
                            </div>
                            8+ characters
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-700 font-bold" : "text-stone-500"}`}>
                            <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${hasUppercase ? "bg-emerald-600 text-white" : "bg-stone-200"}`}>
                              {hasUppercase && <Check className="h-2.5 w-2.5" />}
                            </div>
                            Uppercase letter
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-700 font-bold" : "text-stone-500"}`}>
                            <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${hasLowercase ? "bg-emerald-600 text-white" : "bg-stone-200"}`}>
                              {hasLowercase && <Check className="h-2.5 w-2.5" />}
                            </div>
                            Lowercase letter
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-bold" : "text-stone-500"}`}>
                            <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${hasNumber ? "bg-emerald-600 text-white" : "bg-stone-200"}`}>
                              {hasNumber && <Check className="h-2.5 w-2.5" />}
                            </div>
                            Number (0-9)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-stone-700">
                          Confirm Password
                        </label>
                        {passwordsMatch && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Check className="h-3 w-3" /> Passwords match
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <div className="pointer-events-none absolute left-3.5 z-10 flex h-5 w-5 items-center justify-center text-stone-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          style={{ paddingLeft: "2.85rem", paddingRight: "2.85rem" }}
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-11 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] transition-all bg-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] hover:from-[#650709] hover:to-[#7A1315] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-[#D4AF37]/35 disabled:opacity-50 mt-2"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Submitting Registration...</span>
                        </>
                      ) : (
                        <>
                          <span>Create End-User Account</span>
                          <ArrowRight className="h-4 w-4 text-amber-300" />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 text-center">
                  <p className="text-xs text-stone-600">
                    Already have an account?{" "}
                    <Link
                      href="/"
                      className="font-extrabold text-[#7A1315] hover:text-[#4D0C0D] underline decoration-amber-400 underline-offset-2"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

