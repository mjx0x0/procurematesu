import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between selection:bg-[#7A1315] selection:text-amber-200">
      {/* Top Institutional Header Bar */}
      <header className="w-full bg-[#4D0C0D] text-amber-100/90 border-b border-amber-500/20 py-2.5 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white tracking-wide">
              Mindanao State University - General Santos
            </span>
          </div>
          <span className="text-[11px] sm:text-xs text-amber-200/80 hidden sm:inline font-medium">
            Fatima, General Santos City • RA 12009 (NGPA)
          </span>
        </div>
      </header>

      {/* Main Center Content: University Logo, System Title, Brief Description, Sign In Button */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-xl w-full mx-auto text-center flex flex-col items-center">
          {/* MSU GenSan Official Logo */}
          <div className="mb-6 animate-fade-in-up">
            <MsuLogo size={150} />
          </div>

          {/* System Title */}
          <div className="space-y-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/10 border border-red-900/20 text-[#7A1315] text-xs font-bold uppercase tracking-wider">
              <span>Procurement Management System</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#4D0C0D] tracking-tight">
              Procuremate<span className="text-[#B88E13]">SU</span>
            </h1>
            <p className="text-sm font-semibold text-[#7A1315] tracking-wide uppercase">
              Digital Procurement Logbook &amp; Assistant
            </p>
          </div>

          {/* Brief Description */}
          <p className="text-base sm:text-lg text-stone-700 leading-relaxed max-w-lg mb-8">
            The official procurement management and requisition tracking portal for 
            Mindanao State University - General Santos, ensuring seamless processing 
            and compliance with the New Government Procurement Act (Republic Act No. 12009).
          </p>

          {/* Button for Sign In */}
          <div className="w-full max-w-sm flex flex-col items-center gap-3">
            <Link
              href="/auth/login"
              className="w-full inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#7A1315] via-[#8B1518] to-[#4D0C0D] hover:from-[#630E10] hover:to-[#7A1315] text-white font-semibold text-base py-3.5 px-8 rounded-xl shadow-lg shadow-red-950/25 hover:shadow-xl hover:shadow-red-950/35 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 border border-amber-400/30"
              id="sign-in-button"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </Link>

            <p className="text-xs text-stone-500">
              Sign in using your official <span className="font-semibold text-[#7A1315]">@msugensan.edu.ph</span> account
            </p>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full border-t border-stone-200/80 bg-white/70 py-4 px-4 text-center text-xs text-stone-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            &copy; {new Date().getFullYear()} Mindanao State University - General Santos. All rights reserved.
          </p>
          <p className="text-stone-400">
            Republic Act No. 12009 • BAC &amp; Procurement Management Office
          </p>
        </div>
      </footer>
    </div>
  );
}
