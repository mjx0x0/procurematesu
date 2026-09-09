"use client";

import Link from "next/link";
import { useState } from "react";
import { MsuLogo } from "@/components/msu-logo";
import { Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";

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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 flex flex-col items-center">
            <Link href="/" className="inline-block mb-2"><MsuLogo size={96} /></Link>
            <h1 className="text-2xl font-extrabold text-[#4D0C0D] tracking-tight">Procuremate<span className="text-[#B88E13]">SU</span></h1>
            <p className="text-xs font-semibold text-[#7A1315] tracking-wide uppercase mt-0.5">Mindanao State University - General Santos</p>
          </div>
          <div className="bg-white rounded-2xl p-7 shadow-xl border border-stone-200/90 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-[#4D0C0D]">Registration Submitted</h2>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              Your account for <strong className="text-stone-800">{registeredEmail}</strong> was created successfully. It is now <strong>pending administrator approval</strong>.
            </p>
            <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs leading-relaxed">
              You can sign in only after an authorized ProcuremateSU administrator approves your account. No email verification is required.
            </div>
            <Link href="/auth/login" className="mt-5 w-full bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] text-white py-3 rounded-xl font-semibold text-sm shadow-md border border-amber-400/30 flex items-center justify-center gap-2">
              Continue to Sign In <ArrowRight className="h-4 w-4 text-amber-300" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105 mb-2" title="Return to Home"><MsuLogo size={96} /></Link>
          <div className="mt-2">
            <h1 className="text-2xl font-extrabold text-[#4D0C0D] tracking-tight">Procuremate<span className="text-[#B88E13]">SU</span></h1>
            <p className="text-xs font-semibold text-[#7A1315] tracking-wide uppercase mt-0.5">Mindanao State University - General Santos</p>
          </div>
          <p className="text-xs text-stone-600 mt-2">Create an end-user account with your official university email</p>
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-xl border border-stone-200/90">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" autoComplete="name" className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none transition-all" required /></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">University Email Address</label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@msugensan.edu.ph" autoComplete="email" className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none transition-all" required /></div>
              <p className="text-[11px] text-stone-500 mt-1">Only official @msugensan.edu.ph addresses are accepted.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a secure password" autoComplete="new-password" className="w-full pl-9 pr-11 py-2.5 text-sm border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none transition-all" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              <p className="text-[11px] text-stone-500 mt-1">At least 8 characters, including uppercase, lowercase, and a number.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Confirm Password</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" className="w-full pl-9 pr-11 py-2.5 text-sm border border-stone-300 rounded-xl bg-white text-gray-900 placeholder:text-stone-400 focus:ring-2 focus:ring-[#7A1315]/20 focus:border-[#7A1315] outline-none transition-all" required /><button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" aria-label={showConfirm ? "Hide password" : "Show password"}>{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" /><span>{error}</span></div>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] hover:from-[#630E10] hover:to-[#7A1315] text-white py-3 rounded-xl font-semibold text-sm shadow-md shadow-red-950/20 hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 border border-amber-400/30">
              {loading ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Creating account...</> : <><span>Create End-User Account</span><ArrowRight className="h-4 w-4 text-amber-300" /></>}
            </button>
            <p className="text-center text-xs text-stone-600 pt-1">Already have an account? <Link href="/auth/login" className="font-semibold text-[#7A1315] hover:text-[#4D0C0D]">Sign in</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}
