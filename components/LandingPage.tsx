"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, ExternalLink, MessageCircle, Search, Sparkles, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { MsuLogo } from "@/components/msu-logo";
import LandingLoginCard from "@/components/auth/LandingLoginCard";
import { TRANSPARENCY_PROJECTS, TRANSPARENCY_SOURCE_URL } from "@/lib/transparency-projects";

const FEATURES = [
  [ClipboardList, "01", "Prepare Purchase Requests", "Create and review PR information digitally before completing the required physical submission."],
  [Workflow, "02", "Track the Procurement Flow", "Follow the standardized PMO workflow and view recorded progress for submitted requests."],
  [MessageCircle, "03", "Ask Gab AI", "Get procurement guidance and assistance grounded in the system's available procurement references."],
] as const;

const CATEGORIES = ["All", "Infrastructure", "ICT", "Goods & Equipment", "Services"] as const;
type Category = (typeof CATEGORIES)[number];

export default function LandingPage() {
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");

  const projects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRANSPARENCY_PROJECTS.filter((p) =>
      (category === "All" || p.category === category) &&
      (!q || `${p.title} ${p.reference || ""} ${p.category}`.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [category, query]);

  return (
    <div className="min-h-screen bg-[#F8F6F2] font-sans antialiased text-[#25201D]">
      {/* Hero Section */}
      <section id="home" className="relative min-h-screen overflow-x-clip bg-[#4A002A] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_40%,rgba(245,171,38,0.22),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(123,0,70,0.65),transparent_40%),linear-gradient(135deg,#5C0035_0%,#4A002A_50%,#2C001A_100%)]" />
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#F5AB26]/15 blur-3xl pointer-events-none" />
        <div className="absolute -right-32 -bottom-32 h-[32rem] w-[32rem] rounded-full bg-[#7B0046]/25 blur-3xl pointer-events-none" />

        <header className="fixed inset-x-0 top-0 z-50 border-b border-[#F5AB26]/25 bg-[#4A002A]/90 backdrop-blur-md transition-all shadow-[0_4px_24px_rgba(30,0,18,0.35)]">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-6 py-3.5 sm:px-8">
            <Link href="#home" className="flex min-w-0 items-center gap-3.5 group">
              <MsuLogo size={40} />
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-extrabold tracking-tight sm:text-base text-white group-hover:text-[#F0C83F] transition-colors">
                  MSU GenSan <span className="text-[#F0C83F]">Procurement</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/70">
                  Digital Procurement Management System
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 text-xs font-bold text-white/90 md:flex">
              <Link href="#home" className="hover:text-[#F0C83F] transition-colors">Home</Link>
              <Link href="#about" className="hover:text-[#F0C83F] transition-colors">About</Link>
              <Link href="#transparency" className="hover:text-[#F0C83F] transition-colors">Transparency Board</Link>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1240px] items-center gap-12 px-6 pt-28 pb-16 sm:px-8 lg:grid-cols-[1.18fr_0.82fr] lg:gap-14 lg:py-24">
          <div className="flex flex-col items-start text-left">
            <h1 className="text-left text-3xl sm:text-5xl lg:text-[3.5rem] font-black tracking-[-0.035em] leading-[1.06] text-white">
              <span className="block text-white">MSU GenSan</span>
              <span className="block mt-1.5 text-transparent bg-clip-text bg-gradient-to-r from-[#FFE599] via-[#F5AB26] to-[#F0C83F] drop-shadow-[0_2px_20px_rgba(245,171,38,0.3)]">
                Procurement
              </span>
              <span className="block mt-1 text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.025em] text-[#F9EFE6]">
                Management System
              </span>
            </h1>

            <p className="mt-6 max-w-[560px] text-left text-sm sm:text-base leading-relaxed text-amber-50/90 border-l-2 border-[#F5AB26] pl-4 sm:pl-5 text-pretty font-normal">
              A centralized institutional workspace for Purchase Request preparation, standardized university procurement workflow monitoring, public transparency records, and automated policy guidance powered by <strong className="font-bold text-[#F5AB26]">Gab AI</strong>.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/95 backdrop-blur-md shadow-xs transition-colors hover:bg-white/15">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>RA 9184 Standardized</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/95 backdrop-blur-md shadow-xs transition-colors hover:bg-white/15">
                <Workflow className="h-3.5 w-3.5 text-[#F5AB26]" />
                <span>PMO End-to-End Tracking</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/95 backdrop-blur-md shadow-xs transition-colors hover:bg-white/15">
                <Sparkles className="h-3.5 w-3.5 text-[#F5AB26]" />
                <span>Gab AI Policy Guide</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[420px] justify-self-center lg:justify-self-end">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-[#F5AB26]/15 blur-2xl" />
              <div className="relative">
                <LandingLoginCard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="scroll-mt-20 border-b border-stone-200/80 bg-white">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-20 sm:px-8 sm:py-24">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-[#F5AB26]/40 bg-[#FFFDF5] px-4 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#9A7205]">
              Institutional Procurement Support
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#4D002C] sm:text-4xl">
              About the Procurement System
            </h2>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#F5AB26]" />
          </div>

          <div className="mt-12 grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <div className="text-sm leading-relaxed text-stone-600 sm:text-base">
              <p>
                The <strong className="font-extrabold text-[#4D002C]">MSU Gensan Procurement System</strong> provides Mindanao State University - General Santos personnel with an integrated institutional platform for purchase requests, automated status monitoring, and compliant procurement documentation.
              </p>
              <p className="mt-4">
                Operating strictly in alignment with Philippine public procurement guidelines and university standards, every request progresses through the standardized <strong className="font-extrabold text-[#4D002C]">end-to-end procurement workflow</strong> with complete auditability.
              </p>
              <p className="mt-4">
                Users can also consult <strong className="font-extrabold text-[#4D002C]">Gab AI</strong> for instant guidance on procurement policies, required attachments, and standard operating procedures.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {["Digital Records", "Workflow Tracking", "Transparency Board", "Gab AI Assistant"].map((x) => (
                  <span
                    key={x}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#F5AB26]/40 bg-[#FFFDF5] px-3.5 py-1.5 text-xs font-bold text-[#805F07] shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#F5AB26]" />
                    {x}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                ["Full", "Milestone Tracking", "Complete end-to-end PMO workflow"],
                ["67", "Public Listings", "Open records on transparency board"],
                ["2", "Access Roles", "Separated end-user & admin portals"],
                ["1", "AI Assistant", "Gab AI policy & PR guidance"],
              ].map(([v, l, d]) => (
                <div
                  key={l}
                  className="relative min-h-[130px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#5C0035] via-[#6B003E] to-[#4A002A] p-5 text-white shadow-[0_10px_28px_rgba(77,0,44,0.14)] border border-[#F5AB26]/20"
                >
                  <div className="absolute -right-6 -bottom-8 h-20 w-20 rounded-full bg-[#F5AB26]/15" />
                  <div className="relative text-3xl font-extrabold text-[#F0C83F]">{v}</div>
                  <div className="relative mt-1 text-xs font-bold text-white">{l}</div>
                  <div className="relative mt-1 text-xs leading-relaxed text-white/60">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-stone-200/80 bg-[#F8F6F2]">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-18 sm:px-8 sm:py-20">
          <div className="text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#9A7205]">
              System Capabilities
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#4D002C]">
              One Workspace for University Procurement
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map(([Icon, n, title, text]) => (
              <article
                key={n}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_6px_22px_rgba(40,20,10,0.035)] transition-all hover:-translate-y-1 hover:border-[#F5AB26]/60 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF6E4] text-[#9A7205] border border-[#E9D9AE]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono font-extrabold tracking-wider text-[#F5AB26]">{n}</span>
                </div>
                <h3 className="mt-5 text-base font-extrabold text-[#4D002C]">{title}</h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section id="transparency" className="scroll-mt-20 bg-[#F8F6F2]">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-18 sm:px-8 sm:py-20">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-[#F5AB26]/40 bg-[#FFFDF5] px-4 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#9A7205]">
              Public Disclosure & Accountability
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#4D002C]">
              Transparency Board
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-stone-600">
              Browse publicly listed MSU GenSan procurement notices and bidding documents sourced from official university records.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xs">
              {CATEGORIES.map((x) => (
                <button
                  key={x}
                  onClick={() => setCategory(x)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    category === x
                      ? "bg-gradient-to-r from-[#7B0046] to-[#4D002C] text-white shadow-xs"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {x}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects or references..."
                className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3.5 text-xs sm:text-sm text-stone-800 shadow-xs outline-none focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {projects.map((p, i) => (
              <article
                key={`${p.year}-${p.reference || p.title}-${i}`}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_6px_22px_rgba(40,20,10,0.03)] transition-all hover:border-[#F5AB26]/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg border border-[#7B0046]/20 bg-[#FDF2F7] px-2.5 py-1 text-xs font-extrabold text-[#7B0046]">
                    {p.reference || `PUBLIC-${p.year}`}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700">
                    Public Notice
                  </span>
                </div>
                <h3 className="mt-3 text-sm sm:text-base font-bold leading-snug text-stone-900">{p.title}</h3>
                <p className="mt-1 text-xs font-semibold text-[#F5AB26]">{p.category}</p>
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
                  <span>Year: {p.year} · Category: {p.category}</span>
                  <span className="font-bold text-[#7B0046]">Public Record</span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-xs">
            <p className="text-xs text-stone-600">
              Listings are public procurement disclosures maintained for university transparency and statutory compliance.
            </p>
            <Link
              href={TRANSPARENCY_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7B0046] hover:text-[#F5AB26] transition-colors underline decoration-[#F5AB26] underline-offset-4"
            >
              Official University Source <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#3D0024] to-[#250016] text-white border-t border-[#F5AB26]/20">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F0C83F]">
              Mindanao State University - General Santos
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">MSU GenSan Procurement System</h2>
            <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-white/60">
              Centralized platform for Purchase Requests, standardized procurement workflows, transparency disclosures, and Gab AI assistance.
            </p>
          </div>
          <Link
            href="#home"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-bold hover:border-[#F0C83F] hover:text-[#F0C83F] hover:bg-white/10 transition-all self-start sm:self-auto"
          >
            Back to Top <ArrowRight className="h-3.5 w-3.5 -rotate-90" />
          </Link>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/45">
          © {new Date().getFullYear()} Mindanao State University - General Santos · Procurement Management System
        </div>
      </footer>
    </div>
  );
}
