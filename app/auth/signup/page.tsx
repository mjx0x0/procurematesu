"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SYSTEM_NAME } from "@/lib/system-branding";
import { REGISTRATION_TERMS, REGISTRATION_TERMS_TITLE, REGISTRATION_TERMS_VERSION } from "@/lib/legal/registration-terms";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  Building2,
  Clock,
  ShieldCheck,
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

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
    if (!termsAccepted) {
      setError("Please check the box to agree to the Terms and Conditions and Privacy Notice before registering.");
      return;
    }
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
        body: JSON.stringify({ fullName: cleanName, email: cleanEmail, password, termsAccepted, termsVersion: REGISTRATION_TERMS_VERSION }),
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
    <div className="relative min-h-screen bg-[#FAF8F5] px-4 py-8 sm:py-12 flex flex-col justify-center items-center selection:bg-[#7B0046] selection:text-amber-200">
      {/* Top institutional gold/maroon accent ribbon */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046] z-50" />

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[42rem] rounded-full bg-gradient-to-b from-[#7B0046]/10 via-[#F5AB26]/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#F5AB26]/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl"
      >
        <AnimatePresence mode="wait">
          {success ? (
            /* Registration request pending PMO review */
            <motion.div
              key="pending-registration-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-[0_24px_60px_rgba(77,0,44,0.10)] sm:p-9"
            >
              <div className="absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046]" />

              <div className="mx-auto max-w-xl pt-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A6700]">
                  Registration Status
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#4D002C] sm:text-3xl">
                  Registration Request Submitted
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-600">
                  Your registration request for{" "}
                  <strong className="font-bold text-stone-900">{registeredEmail}</strong>{" "}
                  has been received by the {SYSTEM_NAME}. It is now awaiting verification and approval by the Procurement Management Office (PMO).
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/60 bg-amber-100 text-[#9A7205]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#7B0046]">
                      Pending PMO Verification
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-amber-950">
                      Your account is <strong>not active yet</strong>. The PMO must verify and approve your registration before you can access the portal or sign in.
                    </p>
                    <ul className="mt-3 space-y-1 text-[11px] font-medium leading-relaxed text-stone-600">
                      <li>• No separate email verification link is required.</li>
                      <li>• You may sign in after an administrator approves and activates your account.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Link
                  href="/"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7B0046] via-[#8E0052] to-[#4D002C] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:brightness-105 hover:shadow-lg sm:w-auto"
                >
                  Return to Sign In <ArrowRight className="h-4 w-4 text-amber-300" />
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Registration Form with University Split-Hero Card */
            <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-[0_24px_60px_rgba(40,4,6,0.14)] grid grid-cols-1 md:grid-cols-[340px_1fr] lg:grid-cols-[380px_1fr]">
              {/* Left Institutional Showcase Column */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#4D002C] via-[#610037] to-[#380020] p-7 sm:p-9 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#F5AB26]/20">
                {/* Decorative university watermark and gold aura */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#F5AB26]/15 blur-2xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#8E0052]/30 blur-2xl" />

                <div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                      User <span className="text-[#F0C83F]">Registration</span>
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
              </div>

              {/* Right Form Column */}
              <div className="p-6 sm:p-8 lg:p-9 flex flex-col justify-between">
                <div>
                  <div className="border-b border-stone-100 pb-4 mb-5">
                    <h2 className="text-xl font-black text-[#4D002C] tracking-tight">
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
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-4 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046] transition-all bg-white"
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
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-4 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046] transition-all bg-white"
                          required
                        />
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <Building2 className="h-3 w-3 text-[#7B0046] shrink-0" />
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
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-11 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046] transition-all bg-white"
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
                          className="w-full min-h-[44px] py-2.5 !pl-11 !pr-11 text-sm rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#7B0046]/20 focus:border-[#7B0046] transition-all bg-white"
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

                    {/* Required terms acknowledgement */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <input
                          id="terms-accepted"
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(event) => setTermsAccepted(event.target.checked)}
                          required
                          aria-required="true"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 accent-[#7B0046] focus:ring-[#7B0046]"
                        />
                        <div className="min-w-0 flex-1">
                          <label htmlFor="terms-accepted" className="cursor-pointer text-xs font-semibold leading-relaxed text-stone-700">
                            I have read and agree to the Terms and Conditions and acknowledge the Privacy Notice.
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowTermsDialog(true)}
                            className="mt-1 block text-xs font-extrabold text-[#7B0046] underline decoration-[#C27803] underline-offset-2 hover:text-[#4D002C]"
                          >
                            View Terms and Conditions
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading || !termsAccepted}
                      className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#7B0046] via-[#8E0052] to-[#4D002C] hover:from-[#610037] hover:to-[#7B0046] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-[#F5AB26]/35 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Submitting Registration...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
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
                      className="font-extrabold text-[#7B0046] hover:text-[#4D002C] underline decoration-[#C27803] underline-offset-2"
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

      <AnimatePresence>
        {showTermsDialog && (
          <motion.div
            key="registration-terms-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F1020]/75 p-3 backdrop-blur-sm sm:p-6"
          >
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="registration-terms-title"
              className="flex max-h-[min(92svh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_28px_90px_rgba(20,0,15,0.35)]"
            >
              <div className="h-1.5 shrink-0 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046]" />
              <header className="shrink-0 border-b border-stone-100 bg-[#FFFEFC] px-4 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7B0046]/10 bg-[#7B0046]/5 text-[#7B0046]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A6700]">
                      Required before registration
                    </p>
                    <h2 id="registration-terms-title" className="mt-1 text-lg font-black leading-tight text-[#4D002C] sm:text-xl">
                      {REGISTRATION_TERMS_TITLE}
                    </h2>
                  </div>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-950">
                  Review the terms below. After reading them, close this window and use the checkbox on the registration form to confirm your agreement. Closing this window does not mean you have accepted.
                </p>
                <div className="space-y-5">
                  {REGISTRATION_TERMS.map((section) => (
                    <section key={section.heading}>
                      <h3 className="text-sm font-extrabold text-[#4D002C]">{section.heading}</h3>
                      <div className="mt-1.5 space-y-2">
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={index} className="text-xs leading-relaxed text-stone-600">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                <p className="mt-5 border-t border-stone-100 pt-3 text-[10px] leading-relaxed text-stone-400">
                  This notice describes the System's intended registration and information-handling practices. The university's approved policies and applicable laws prevail where they differ.
                </p>
              </div>

              <footer className="shrink-0 border-t border-stone-200 bg-white px-4 py-4 sm:px-6">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTermsDialog(false)}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#7B0046] px-5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#610037]"
                  >
                    Close
                  </button>
                </div>
              </footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

