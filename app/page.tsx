import Link from "next/link";
import { ArrowRight, ClipboardList, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { MsuLogo } from "@/components/msu-logo";
import LandingLoginCard from "@/components/auth/LandingLoginCard";

const FEATURES = [
  { icon: ClipboardList, number: "01", title: "Prepare PRs", text: "Create and review Purchase Requests digitally before physical submission." },
  { icon: ShieldCheck, number: "02", title: "Track Progress", text: "Follow the official procurement stages and recorded updates in one place." },
  { icon: MessageCircle, number: "03", title: "Get Assistance", text: "Ask procurement-related questions through the built-in assistant." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col">
      <header className="w-full bg-[#4D0C0D] text-white border-b border-amber-500/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-5">
          <div className="flex items-center gap-3 min-w-0">
            <MsuLogo size={40} />
            <div className="min-w-0 border-l border-white/15 pl-3">
              <p className="text-xs sm:text-sm font-extrabold truncate">Mindanao State University - General Santos</p>
              <p className="text-[10px] sm:text-xs text-amber-200/75 mt-0.5">Procurement Management Office</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em]">
            <span className="text-amber-100/70">Fatima, General Santos City</span>
            <span className="h-1 w-1 rounded-full bg-amber-400/70" />
            <span className="text-amber-200">RA 12009</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-14">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_460px] gap-10 lg:gap-14 xl:gap-20 items-center min-h-[calc(100vh-150px)]">
          <section className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="absolute -inset-1 rounded-2xl bg-[#B88E13]/10 blur-lg" />
                <MsuLogo size={82} />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#7A1315]/15 bg-[#7A1315]/[0.06] px-3 py-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7A1315]">
              <Sparkles className="h-3.5 w-3.5 text-[#B88E13]" />
              Procurement Management System
            </div>

            <h1 className="mt-4 text-5xl sm:text-6xl xl:text-7xl font-black tracking-[-0.04em] leading-[0.95] text-[#4D0C0D]">
              Procuremate<span className="text-[#B88E13]">SU</span>
            </h1>
            <p className="mt-3 text-[11px] sm:text-sm font-extrabold uppercase tracking-[0.17em] text-[#7A1315]">Digital Procurement Logbook &amp; Assistant</p>
            <p className="mt-6 max-w-2xl mx-auto lg:mx-0 text-sm sm:text-base leading-7 text-stone-600">
              A centralized portal for Purchase Request preparation, procurement status tracking, digital records, and procurement-related inquiry support for Mindanao State University - General Santos.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto lg:mx-0 text-left">
              {FEATURES.map(({ icon: Icon, number, title, text }) => (
                <div key={number} className="group rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#B88E13]/35 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A1315]/[0.07] text-[#7A1315]"><Icon className="h-4 w-4" /></div>
                    <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#B88E13]">{number}</span>
                  </div>
                  <h2 className="mt-3 text-sm font-extrabold text-stone-800">{title}</h2>
                  <p className="mt-1 text-[11px] leading-5 text-stone-500">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-2 text-xs">
              <span className="text-stone-500">Need an account?</span>
              <Link href="/auth/signup" className="inline-flex items-center gap-1.5 font-extrabold text-[#7A1315] hover:text-[#4D0C0D] transition-colors">
                Create an account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <section className="w-full max-w-[460px] mx-auto lg:ml-auto">
            <LandingLoginCard />
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-left shadow-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-[#7A1315]" />
              <p className="text-[11px] leading-5 text-stone-600">
                <span className="font-bold text-stone-800">Institutional access.</span> Use your official <span className="font-semibold text-[#7A1315]">@msugensan.edu.ph</span> account. New registrations require administrator approval.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-stone-200/80 bg-white/80 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-xs text-stone-500">
          <p>&copy; {new Date().getFullYear()} Mindanao State University - General Santos. All rights reserved.</p>
          <p className="text-stone-400">Republic Act No. 12009 • BAC &amp; Procurement Management Office</p>
        </div>
      </footer>
    </div>
  );
}
