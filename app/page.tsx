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
    <div className="min-h-screen bg-[#3B0507] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_45%,rgba(184,142,19,.20),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(122,19,21,.60),transparent_38%),linear-gradient(135deg,#350708_0%,#5A090B_48%,#3B0507_100%)]" />
      <div className="absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-[#B88E13]/10 blur-3xl pointer-events-none" />
      <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#7A1315]/30 blur-3xl pointer-events-none" />

      <header className="relative z-10 w-full border-b border-amber-300/15 bg-[#350708]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-5">
          <div className="flex items-center gap-3 min-w-0">
            <MsuLogo size={40} />
            <div className="min-w-0 border-l border-white/15 pl-3">
              <p className="text-xs sm:text-sm font-extrabold truncate">Mindanao State University - General Santos</p>
              <p className="text-[10px] sm:text-xs text-amber-200/65 mt-0.5">Procurement Management Office</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em]">
            <span className="text-white/60">Institutional Procurement Portal</span>
            <span className="h-1 w-1 rounded-full bg-amber-400/70" />
            <span className="text-amber-200">MSU-GenSan</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-14">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_460px] gap-10 lg:gap-14 xl:gap-20 items-center min-h-[calc(100vh-150px)]">
          <section className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-300/10 border border-amber-300/25 text-amber-200 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.14em] shadow-[0_0_25px_rgba(212,175,55,.08)]">
              <Sparkles className="h-3.5 w-3.5" />
              Digital Procurement Portal
            </div>

            <div className="mt-7 flex justify-center lg:justify-start">
              <div className="relative p-3 rounded-2xl bg-white/[0.06] border border-amber-300/20 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,.20)]">
                <div className="absolute -inset-2 rounded-3xl bg-amber-300/10 blur-xl" />
                <div className="relative"><MsuLogo size={78} /></div>
              </div>
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl xl:text-7xl font-black tracking-[-0.045em] leading-[.92]">
              MSU GenSan
              <span className="block mt-2 text-[#E5C34E]">Procurement</span>
              <span className="block text-white">Management System</span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto lg:mx-0 text-sm sm:text-base leading-7 text-white/65">
              ProcuremateSU brings Purchase Request preparation, procurement tracking, digital records, and inquiry assistance into one institutional workspace.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto lg:mx-0 text-left">
              {FEATURES.map(({ icon: Icon, number, title, text }) => (
                <div key={number} className="group rounded-2xl border border-white/10 bg-white/[0.055] backdrop-blur-sm p-4 shadow-lg transition-all hover:-translate-y-0.5 hover:border-amber-300/25">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300/10 text-[#E5C34E]"><Icon className="h-4 w-4" /></div>
                    <span className="text-[10px] font-extrabold tracking-[0.14em] text-[#E5C34E]">{number}</span>
                  </div>
                  <h2 className="mt-3 text-sm font-extrabold text-white">{title}</h2>
                  <p className="mt-1 text-[11px] leading-5 text-white/45">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-2 text-xs">
              <span className="text-white/40">Need an account?</span>
              <Link href="/auth/signup" className="inline-flex items-center gap-1.5 font-extrabold text-[#E5C34E] hover:text-white transition-colors">
                Create an account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <section className="w-full max-w-[460px] mx-auto lg:ml-auto">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[28px] bg-[#B88E13]/10 blur-2xl" />
              <div className="relative"><LandingLoginCard /></div>
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300/20 bg-black/15 backdrop-blur-sm px-4 py-3 text-left">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-[#E5C34E]" />
              <p className="text-[11px] leading-5 text-white/55">
                <span className="font-bold text-white/80">Institutional access.</span> Use your official <span className="font-semibold text-white/75">@msugensan.edu.ph</span> account. New registrations require administrator approval.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 w-full border-t border-white/10 bg-[#2A0405]/55 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-xs text-white/35">
          <p>&copy; {new Date().getFullYear()} Mindanao State University - General Santos</p>
          <p>ProcuremateSU • Procurement Management Office</p>
        </div>
      </footer>
    </div>
  );
}
