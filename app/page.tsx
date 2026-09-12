import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";
import LandingLoginCard from "@/components/auth/LandingLoginCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col selection:bg-[#7A1315] selection:text-amber-200">
      <header className="w-full bg-[#4D0C0D] text-amber-100 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <MsuLogo size={42} />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-white truncate">Mindanao State University - General Santos</p>
              <p className="text-[10px] sm:text-xs text-amber-200/75">Procurement Management Office</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-amber-100/80 whitespace-nowrap">Fatima, General Santos City • RA 12009</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14 flex items-center">
        <div className="w-full grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
          <section className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-sm">
                <MsuLogo size={105} />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7A1315]/8 border border-[#7A1315]/15 text-[#7A1315] text-[11px] font-extrabold uppercase tracking-[0.14em]">
              Procurement Management System
            </div>
            <h1 className="mt-4 text-5xl sm:text-6xl font-black tracking-tight text-[#4D0C0D]">
              Procuremate<span className="text-[#B88E13]">SU</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base font-bold text-[#7A1315] uppercase tracking-[0.16em]">Digital Procurement Logbook &amp; Assistant</p>
            <p className="mt-6 max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg leading-8 text-stone-700">
              A centralized portal for Purchase Request preparation, procurement status tracking, digital records, and procurement-related inquiry support for Mindanao State University - General Santos.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto lg:mx-0 text-left">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold text-[#7A1315]">01</div><div className="mt-1 text-sm font-bold text-stone-800">Prepare PR</div><p className="mt-1 text-xs leading-5 text-stone-500">Create and review your Purchase Request online.</p></div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold text-[#7A1315]">02</div><div className="mt-1 text-sm font-bold text-stone-800">Track Progress</div><p className="mt-1 text-xs leading-5 text-stone-500">Follow the procurement process and recorded updates.</p></div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold text-[#7A1315]">03</div><div className="mt-1 text-sm font-bold text-stone-800">Get Assistance</div><p className="mt-1 text-xs leading-5 text-stone-500">Access procurement guidance through the assistant.</p></div>
            </div>

            <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-4 text-xs font-semibold">
              <Link href="/auth/signup" className="inline-flex items-center gap-1.5 text-[#7A1315] hover:text-[#4D0C0D]">New user? Create an account <ArrowRight className="h-3.5 w-3.5" /></Link>
              <span className="text-stone-300">|</span>
              <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#7A1315]">Open standalone login <ExternalLink className="h-3.5 w-3.5" /></Link>
            </div>
          </section>

          <section className="w-full max-w-md mx-auto lg:ml-auto">
            <LandingLoginCard />
            <p className="mt-4 text-center text-[11px] leading-5 text-stone-500 px-4">Access is restricted to authorized ProcuremateSU accounts using official university credentials. Account approval is managed by the administrator.</p>
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
