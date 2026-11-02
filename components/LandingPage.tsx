"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Building2, CheckCircle2, ClipboardList, ExternalLink, FileText, MapPin, Phone, Printer, Scale, Search, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { MsuLogo } from "@/components/msu-logo";
import LandingLoginCard from "@/components/auth/LandingLoginCard";
import { TRANSPARENCY_PROJECTS, TRANSPARENCY_SOURCE_URL } from "@/lib/transparency-projects";
import { SYSTEM_DESCRIPTION, SYSTEM_NAME, SYSTEM_TAGLINE } from "@/lib/system-branding";

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
        {/* Animated ambient background layers */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#5C0035] via-[#4A002A] to-[#2C001A] bg-[length:200%_200%] pointer-events-none"
          style={{ animation: "hero-gradient-shift 18s ease infinite" }}
        />

        {/* Animated floating color orbs */}
        <div
          className="absolute -left-28 top-1/4 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-[#F5AB26]/25 via-[#F5AB26]/12 to-transparent blur-3xl pointer-events-none"
          style={{ animation: "hero-orb-float-1 20s ease-in-out infinite alternate" }}
        />
        <div
          className="absolute -right-28 top-12 h-[36rem] w-[36rem] rounded-full bg-gradient-to-bl from-[#8E0052]/35 via-[#7B0046]/20 to-transparent blur-3xl pointer-events-none"
          style={{ animation: "hero-orb-float-2 24s ease-in-out infinite alternate" }}
        />
        <div
          className="absolute left-1/3 -bottom-24 h-[32rem] w-[32rem] rounded-full bg-gradient-to-t from-[#F5AB26]/20 via-[#7B0046]/18 to-transparent blur-3xl pointer-events-none"
          style={{ animation: "hero-orb-float-3 22s ease-in-out infinite alternate" }}
        />
        <div
          className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-[#FFE599]/12 blur-2xl pointer-events-none"
          style={{ animation: "hero-shimmer-pulse 14s ease-in-out infinite" }}
        />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#F5AB26_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <header className="fixed inset-x-0 top-0 z-50 border-b border-[#F5AB26]/25 bg-[#4A002A]/90 backdrop-blur-md transition-all shadow-[0_4px_24px_rgba(30,0,18,0.35)]">
          <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-6 px-6 py-3.5 sm:px-8">
            <Link href="#home" className="flex min-w-0 items-center gap-3.5 group">
              <MsuLogo size={40} />
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-extrabold tracking-tight sm:text-base text-white group-hover:text-amber-200 transition-colors">
                  Procure<span className="text-amber-200/90 font-black">M</span>ate<span className="text-amber-200/90 font-black">SU</span>
                </div>
                <div className="text-[9px] font-normal font-[system-ui] not-italic uppercase tracking-[0.16em] text-amber-200/70">
                  {SYSTEM_TAGLINE}
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-5 text-xs font-bold text-white/90 lg:flex">
              <Link href="#home" className="hover:text-[#F0C83F] transition-colors">Home</Link>
              <Link href="#how-it-works" className="hover:text-[#F0C83F] transition-colors">How It Works</Link>
              <Link href="#about" className="hover:text-[#F0C83F] transition-colors">About</Link>
              <Link href="#resources" className="hover:text-[#F0C83F] transition-colors">Resources</Link>
              <Link href="#transparency" className="hover:text-[#F0C83F] transition-colors">Transparency</Link>
              <Link href="#contact" className="hover:text-[#F0C83F] transition-colors">Contact</Link>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-10 px-6 pt-24 pb-16 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center text-center lg:items-start lg:text-left w-full"
          >
            <div className="w-full">
              <p className="mb-5 text-center lg:text-left text-xs sm:text-sm font-extrabold uppercase tracking-[0.24em] text-[#FFD043]">
                MSU – GENERAL SANTOS CITY
              </p>
              <h1 className="w-full text-center lg:text-left font-black tracking-[-0.035em] leading-[1.14]">
                <span className="block text-[2.45rem] sm:text-5xl lg:text-[3.5rem] xl:text-[4.05rem] font-black text-[#FFFDF8] pb-1 leading-[1.08]">
                  Digital Procurement
                </span>
                <span className="mt-1 block pb-2 text-[2.25rem] sm:text-5xl lg:text-[3.15rem] xl:text-[3.85rem] font-black leading-[1.12] text-transparent bg-clip-text bg-gradient-to-r from-[#FFF9E6] via-[#FFD043] to-[#F59E0B]">
                  Logbook &amp; Inquiry System
                </span>
              </h1>

              <p className="mx-auto mt-7 max-w-[700px] border-l-4 border-[#F5AB26] pl-5 text-left text-sm sm:text-base lg:text-[1.05rem] leading-relaxed text-amber-50/95 font-normal lg:mx-0 text-pretty">
                {SYSTEM_DESCRIPTION}
              </p>
              <p className="sr-only">{SYSTEM_NAME}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
            className="w-full max-w-[520px] justify-self-center lg:justify-self-end"
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-[#F5AB26]/15 blur-2xl" />
              <div className="relative">
                <LandingLoginCard />
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-20 border-b border-stone-200/80 bg-[#F8F6F2]">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C27803]">For MSU-GenSan Personnel</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#4D002C] sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
              Follow your Purchase Request from digital preparation to official receipt and progress monitoring.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                number: "01",
                Icon: ClipboardList,
                title: "Create a PR Draft",
                description: "Enter the procurement purpose, requesting unit, and item details in the digital form.",
              },
              {
                number: "02",
                Icon: Printer,
                title: "Review, Print & Sign",
                description: "Check the details, print the form, and secure the required university signatures.",
              },
              {
                number: "03",
                Icon: Building2,
                title: "Submit the Printed Copy",
                description: "Bring the signed physical Purchase Request to the Procurement Management Office.",
              },
              {
                number: "04",
                Icon: FileText,
                title: "Office Receipt & Recording",
                description: "The office confirms receipt and records the official PR number for tracking.",
              },
              {
                number: "05",
                Icon: Workflow,
                title: "Track Your Request",
                description: "Monitor recorded updates as your request moves through the university procurement workflow.",
              },
            ].map((step, index) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.42, delay: index * 0.06, ease: "easeOut" }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="relative flex min-h-[220px] flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_6px_22px_rgba(40,20,10,0.035)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold tracking-widest text-[#C27803]">{step.number}</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9D9AE] bg-[#FFF6E4] text-[#7B0046]">
                    <step.Icon className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="mt-5 text-sm font-extrabold leading-snug text-[#4D002C]">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{step.description}</p>
              </motion.article>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#E7D5A9] bg-[#FFF9E9] px-4 py-3.5 text-xs leading-relaxed text-stone-700">
            <span className="mt-0.5 shrink-0 text-[#A36B00]"><CheckCircle2 className="h-4 w-4" /></span>
            <p>
              <strong className="font-bold text-[#4D002C]">Important:</strong> Creating a digital draft does not mean the Procurement Office has officially received the request. The printed and signed copy must be submitted, and office receipt must be recorded before the request proceeds in the official workflow.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="scroll-mt-20 border-b border-stone-200/80 bg-white">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-20 sm:px-8 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <h2 className="text-3xl font-extrabold tracking-tight text-[#4D002C] sm:text-4xl">
              About the Digital Procurement System
            </h2>
          </motion.div>

          <div className="mt-12 grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="text-sm leading-relaxed text-stone-600 sm:text-base"
            >
              <p>
                The <strong className="font-extrabold text-[#4D002C]">{SYSTEM_NAME}</strong> provides Mindanao State University - General Santos personnel with an integrated institutional platform for Purchase Request preparation, procurement workflow monitoring, transparency disclosures, and procurement policy assistance.
              </p>
              <p className="mt-4">
                Operating strictly in alignment with Philippine public procurement guidelines and university standards, every request progresses through the standardized <strong className="font-extrabold text-[#4D002C]">end-to-end procurement workflow</strong> with complete auditability.
              </p>
              <p className="mt-4">
                Users can also consult <strong className="font-extrabold text-[#4D002C]">Gab AI</strong> for instant guidance on procurement policies, required attachments, and standard operating procedures.
              </p>

            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  value: "20",
                  unit: "Stages",
                  label: "Workflow Tracking",
                  desc: "End-to-end PMO milestone verification from draft to delivery",
                },
                {
                  value: "60+",
                  unit: "Projects",
                  label: "Transparency Board",
                  desc: "Publicly accessible university bidding notices, awards & contracts",
                },
                {
                  value: "Dual",
                  unit: "Portals",
                  label: "Role-Based Access",
                  desc: "Separated workspaces for campus requisitioners and PMO admins",
                },
                {
                  value: "24/7",
                  unit: "Support",
                  label: "Gab AI Policy Guide",
                  desc: "Instant compliance answers grounded in RA 12009 & GPPB issuances",
                },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#4D002C] via-[#5B0034] to-[#36001E] p-5 text-white shadow-[0_12px_32px_rgba(77,0,44,0.18)] border border-[#F5AB26]/25 transition-all duration-200"
                >
                  <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-[#F5AB26]/10 blur-xl group-hover:bg-[#F5AB26]/20 transition-colors" />

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl sm:text-4xl font-black text-[#FFD043] font-mono tracking-tight">
                        {card.value}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80 rounded-md bg-white/10 px-2 py-0.5 border border-white/10 backdrop-blur-xs">
                        {card.unit}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-white tracking-tight">
                      {card.label}
                    </h3>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-stone-200/80 font-normal">
                    {card.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>



      {/* Procurement Laws & Official Resources */}
      <section id="resources" className="scroll-mt-20 border-b border-stone-200/80 bg-white">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-16 sm:px-8 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C27803]">Primary References</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#4D002C] sm:text-4xl">
              Procurement Laws & Official Resources
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
              Consult official government publications and GPPB issuances for the laws, rules, and policy guidance relevant to public procurement.
            </p>
          </motion.div>

          <div className="mt-9 grid gap-4 md:grid-cols-2">
            {[
              {
                Icon: Scale,
                label: "Republic Act No. 12009",
                subtitle: "New Government Procurement Act",
                description: "Read the statute establishing the current New Government Procurement Act framework.",
                href: "https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/97750",
                linkLabel: "Read the Act",
              },
              {
                Icon: BookOpen,
                label: "Approved Implementing Rules",
                subtitle: "GPPB Resolution No. 02-2025",
                description: "Access the IRR approved by the GPPB and published in the Official Gazette on 10 February 2025.",
                href: "https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf",
                linkLabel: "View the approved IRR",
              },
              {
                Icon: FileText,
                label: "GPPB Circulars",
                subtitle: "Policy guidance and procedures",
                description: "Browse official circulars containing procurement guidelines and supplemental policy instructions.",
                href: "https://www.gppb.gov.ph/circulars/",
                linkLabel: "Browse circulars",
              },
              {
                Icon: ClipboardList,
                label: "GPPB Resolutions",
                subtitle: "Board approvals and issuances",
                description: "Review resolutions approving procurement policies, standard forms, and related guidelines.",
                href: "https://www.gppb.gov.ph/resolutions/",
                linkLabel: "Browse resolutions",
              },
            ].map((resource, index) => (
              <motion.a
                key={resource.label}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group flex min-h-[160px] flex-col rounded-2xl border border-stone-200 bg-[#FCFBF8] p-5 shadow-[0_4px_18px_rgba(40,20,10,0.025)] transition-colors hover:border-[#C27803]/60 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9D9AE] bg-[#FFF6E4] text-[#7B0046]">
                    <resource.Icon className="h-5 w-5" />
                  </span>
                  <ExternalLink className="h-4 w-4 text-stone-400 transition-colors group-hover:text-[#7B0046]" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-[#4D002C]">{resource.label}</h3>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#A36B00]">{resource.subtitle}</p>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{resource.description}</p>
                <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#7B0046]">
                  {resource.linkLabel} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.a>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-amber-700"><BookOpen className="h-4 w-4" /></span>
              <p className="text-xs leading-relaxed text-stone-700">
                <strong className="font-bold text-[#4D002C]">IRR reference reminder:</strong> GPPB Public Advisory No. 09-2026 says the 31 March 2026 IRR edition was withdrawn. Use the IRR approved under GPPB Resolution No. 02-2025.
              </p>
            </div>
            <a
              href="https://www.gppb.gov.ph/public-advisory-no-09-2026/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#7B0046] hover:text-[#4D002C]"
            >
              Read GPPB Advisory <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section id="transparency" className="scroll-mt-20 bg-stone-50/60 border-t border-stone-200/80">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-16 sm:px-8 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <h2 className="text-3xl font-extrabold tracking-tight text-[#4D002C]">
              Transparency Board
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-stone-600">
              Browse publicly listed MSU GenSan procurement notices and bidding documents sourced from official university records.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-2xs">
              {CATEGORIES.map((x) => (
                <button
                  key={x}
                  onClick={() => setCategory(x)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    category === x
                      ? "bg-[#7B0046] text-white shadow-2xs"
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
                className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3.5 text-xs sm:text-sm text-stone-800 shadow-2xs outline-none focus:border-[#7B0046] focus:ring-1 focus:ring-[#7B0046]"
              />
            </div>
          </motion.div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {projects.map((p, i) => (
              <motion.article
                key={`${p.year}-${p.reference || p.title}-${i}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (i % 2) * 0.08, ease: "easeOut" }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs transition-shadow hover:border-stone-300 hover:shadow-xs cursor-default"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-mono text-xs font-bold text-stone-800">
                    {p.reference || `PUBLIC-${p.year}`}
                  </span>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
                    Public Notice
                  </span>
                </div>
                <h3 className="mt-3 text-sm sm:text-base font-bold leading-snug text-stone-900">{p.title}</h3>
                <p className="mt-1.5 text-xs font-medium text-stone-500">{p.category}</p>
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
                  <span>Year: {p.year}</span>
                  <span className="font-semibold text-stone-700">Official Record</span>
                </div>
              </motion.article>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-3.5 shadow-2xs"
          >
            <p className="text-xs text-stone-600">
              Listings are public procurement disclosures maintained for university transparency and statutory compliance.
            </p>
            <Link
              href={TRANSPARENCY_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B0046] hover:text-stone-900 transition-colors"
            >
              Official University Source <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>


      {/* Contact & Support */}
      <section id="contact" className="scroll-mt-20 border-t border-stone-200/80 bg-[#F8F6F2]">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-16 sm:px-8 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C27803]">University Assistance</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#4D002C] sm:text-4xl">
              Contact & Support
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
              For official procurement concerns, contact the Procurement Management Office or consult the university directory for updated office information.
            </p>
          </motion.div>

          <div className="mx-auto mt-9 grid max-w-4xl gap-4 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.42, ease: "easeOut" }}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_6px_22px_rgba(40,20,10,0.035)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E9D9AE] bg-[#FFF6E4] text-[#7B0046]">
                <Phone className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#C27803]">Procurement Management Office</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#4D002C]">Assoc. Prof. Nelson P. Benares, Jr.</h3>
              <p className="mt-1 text-xs text-stone-500">PMO Director · MSU-General Santos</p>
              <a
                href="tel:+639088105634"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4D002C] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#7B0046]"
              >
                <Phone className="h-4 w-4" />
                +63 908 810 5634
              </a>
              <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
                Contact details are listed in the official MSU-GenSan University Directory.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.42, delay: 0.08, ease: "easeOut" }}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_6px_22px_rgba(40,20,10,0.035)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E9D9AE] bg-[#FFF6E4] text-[#7B0046]">
                <MapPin className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#C27803]">Office Information</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#4D002C]">University Directory</h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                Office arrangements may change. Call the PMO before visiting to confirm the current office location and visiting instructions.
              </p>
              <a
                href="https://msugensan.edu.ph/about/university-directory/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#7B0046] transition-colors hover:text-[#4D002C]"
              >
                View University Directory <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#3D0024] to-[#250016] text-white border-t border-[#F5AB26]/20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8"
        >
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F0C83F]">
              Mindanao State University - General Santos
            </p>
            <h2 className="mt-1 max-w-xl text-xl font-extrabold tracking-tight">{SYSTEM_NAME}</h2>
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
        </motion.div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/45">
          © {new Date().getFullYear()} {SYSTEM_NAME}
        </div>
      </footer>
    </div>
  );
}
