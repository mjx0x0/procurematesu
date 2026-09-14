"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { MsuLogo } from "@/components/msu-logo";
import LandingLoginCard from "@/components/auth/LandingLoginCard";
import { Shield, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !cancelled) {
          const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!cancelled) {
            router.replace(profile?.role === "admin" ? "/admin" : "/dashboard");
            return;
          }
        }
      } catch (err) {
        console.warn("Session check notice:", err);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    checkActiveSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] px-4 py-10 relative selection:bg-[#7A1315] selection:text-amber-200">
      {/* Decorative top gold gradient accent */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4D0C0D] via-[#D4AF37] to-[#7A1315]" />

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link
            href="/"
            className="inline-block mb-3 hover:scale-105 transition-transform duration-200"
            title="Return to Home"
          >
            <MsuLogo size={76} />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4D0C0D]/10 text-[#4D0C0D] text-[10px] font-bold tracking-wide uppercase mb-2">
            <Shield className="w-3 h-3 text-[#B88E13]" />
            Institutional Portal
          </div>
          <h1 className="text-2xl font-black text-[#4D0C0D] tracking-tight">
            MSU GenSan <span className="text-[#B88E13]">Procurement</span>
          </h1>
          <p className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase mt-1">
            Mindanao State University - General Santos
          </p>
        </div>

        {/* Login form card */}
        {checkingSession ? (
          <div className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-xl backdrop-blur-sm text-center">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-[#7A1315]/20 border-t-[#7A1315] animate-spin" />
            <p className="mt-3 text-xs font-semibold text-stone-600">Verifying session...</p>
          </div>
        ) : (
          <LandingLoginCard />
        )}

        {/* Back to Home link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#4D0C0D] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Public Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
