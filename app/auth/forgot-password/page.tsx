"use client";

import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { MsuLogo } from "@/components/msu-logo";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 py-8">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105 mb-2" title="Return to Home">
            <MsuLogo size={88} />
          </Link>
          <h1 className="text-2xl font-extrabold text-[#4D0C0D] tracking-tight">
            Procuremate<span className="text-[#B88E13]">SU</span>
          </h1>
          <p className="text-xs font-semibold text-[#7A1315] uppercase tracking-wide mt-0.5">
            Account Recovery • MSU-GenSan
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-stone-200/90">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
