import Link from "next/link";
import { ArrowRight, ClipboardList, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";
import LandingLoginCard from "@/components/auth/LandingLoginCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col selection:bg-[#7A1315] selection:text-amber-200">
      <header className="w-full bg-[#4D0C0D] text-amber-100 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <MsuLogo size={42} />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-white truncate">Mindanao State University - General Santos</p>
              <p className="text-[10px] sm:text-xs text-amber-200/75">Procurement Management Office</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold">
            <span className="text-amber-100/70">Fatima, General Santos City</span>
            <span className="h-1 w-1 rounded-full bg-amber-400/60" />
            <span className="text-amber-100/80">RA 12009</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12 flex items-center">
        <div className="w-full grid lg:grid-cols-[1.08fr_0.92fr] gap-10 lg:gap-14 xl:gap-20 items-center">
          <section className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-5">
              <div className="relative p-3 rounded-2xl bg-white border border-stone-200 shadow-sm">
                <div className="absolute -inset-1 rounded-2xl bg-[#B88E13]/10 blur-md -z-10" />
                <MsuLogo size={88} />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7A1315]/[0.07] border border-[#7A1315]/15 text-[#7A1315] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.14em]">
              <Sparkles className="h-3.5 w-3.5" />
              Procurement Management System
            </div>

            <h1 className="mt-4 text-5xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-[0.95] text-[#4D0C0D]">
              Procuremate<span className="text-[#B88E13]">SU</span>
            </h1>
            <p className="mt-3 text-xs sm:text-sm font-bold text-[#7A1315] uppercase tracking-[0.16em]">Digital Procurement Logbook &amp; Assistant</p>

            <p className="mt-5 max-w-2xl mx-auto lg:mx-0 text-sm sm:text-base leading-7 text-stone-600">
              A centralized portal for Purchase Request preparation, procurement status tracking, digital records, and procurement-related inquiry support for Mindanao State University - General Santos.
            </p>

            <div className="mt-7 grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto lg:mx-0 text-left">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <ClipboardList className="h-4 w-4 text-[#7A1315]" />
                <div className="mt-2 text-sm font-bold text-stone-800">Prepare PRs</div>
                <p className="mt-1 text-xs leading-5 text-stone-500">Create and review Purchase Requests digitally.</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <ShieldCheck className="h-4 w-4 text-[#7A1315]" />
                <div className="mt-2 text-sm font-bold text-stone-800">Track Securely</div>
                <p className="mt-1 text-xs leading-5 text-stone-500">Follow recorded procurement stages and updates.</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <MessageCircle className="h-4 w-4 text-[#7A1315]" />
                <div className="mt-2 text-sm font-bold text-stone-800">Get Assistance</div>
                <p className="mt-1 text-xs leading-5 text-stone-500">Ask procurement-related questions through the assistant.</p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-semibold">
              <span className="text-stone-500">New to ProcuremateSU?</span>
              <Link href="/auth/signup" className="inline-flex items-center gap-1.5 text-[#7A1315] hover:text-[#4D0C0D] transition-colors">
                Create an account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <section className="w-full max-w-[440px] mx-auto lg:ml-auto">
            <LandingLoginCard />
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-left">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-[#7A1315]" />
              <p className="text-[11px] leading-5 text-stone-600">
                <span className="font-bold text-stone-800">Institutional access.</span> Use your official <span className="font-semibold">@msugensan.edu.ph</span> account. New registrations require administrator approval before access is granted.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-stone-200/80 bg-white/70 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <p>&copy; {new Date().getFullYear()} Mindanao State University - General Santos. All rights reserved.</p>
          <p className="text-stone-400">Republic Act No. 12009 • BAC &amp; Procurement Management Office</p>
        </div>
      </footer>
    </div>
  );
}
