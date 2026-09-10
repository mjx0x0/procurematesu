"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { TRANSPARENCY_PROJECTS, TRANSPARENCY_SOURCE_URL } from "@/lib/transparency-projects";

const YEARS = [2026, 2025, 2024];
const CATEGORIES = ["All", "Infrastructure", "Goods & Equipment", "Services", "ICT", "Research & Laboratory", "Agriculture & Development", "Other"] as const;

type Category = (typeof CATEGORIES)[number];

export default function TransparencyPage() {
  const [year, setYear] = useState<number | "all">("all");
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRANSPARENCY_PROJECTS.filter((project) => {
      const matchesYear = year === "all" || project.year === year;
      const matchesCategory = category === "All" || project.category === category;
      const matchesSearch = !q || `${project.title} ${project.reference || ""} ${project.category}`.toLowerCase().includes(q);
      return matchesYear && matchesCategory && matchesSearch;
    });
  }, [year, category, query]);

  const counts = useMemo(() => ({
    total: TRANSPARENCY_PROJECTS.length,
    infrastructure: TRANSPARENCY_PROJECTS.filter((p) => p.category === "Infrastructure").length,
    ict: TRANSPARENCY_PROJECTS.filter((p) => p.category === "ICT").length,
  }), []);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="bg-white border-b border-red-950/10 px-4 py-3 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-[#7A1315] hover:text-[#4D0C0D]">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-[#7A1315] p-2 rounded-xl text-amber-300 border border-amber-400/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-[#4D0C0D]">Procurement Transparency</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="bg-gradient-to-br from-[#4D0C0D] via-[#7A1315] to-[#91191C] rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-sm mb-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-200 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Public Procurement Information
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">MSU-Gensan Procurement Transparency</h1>
            <p className="text-sm sm:text-base text-white/80 mt-2 leading-relaxed">
              Explore publicly listed procurement projects of Mindanao State University - General Santos, organized by year and project category.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <a href={TRANSPARENCY_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-[#7A1315] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors">
                Official MSU-Gensan Bidding Documents <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-6">
          <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-5">
            <div className="text-xl sm:text-2xl font-extrabold text-[#4D0C0D]">{counts.total}</div>
            <div className="text-[11px] sm:text-sm text-stone-500 mt-1">Public listings</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-5">
            <div className="text-xl sm:text-2xl font-extrabold text-[#7A1315]">{counts.infrastructure}</div>
            <div className="text-[11px] sm:text-sm text-stone-500 mt-1">Infrastructure</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-5">
            <div className="text-xl sm:text-2xl font-extrabold text-amber-700">{counts.ict}</div>
            <div className="text-[11px] sm:text-sm text-stone-500 mt-1">ICT projects</div>
          </div>
        </div>

        <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-stone-200">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#4D0C0D]">Public Procurement Project Directory</h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">Search projects, contract/reference numbers, and categories.</p>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:ring-2 focus:ring-red-900/10 focus:border-red-300" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <select value={year} onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700">
                <option value="all">All years</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-xs text-stone-500 self-center sm:ml-auto">Showing {filtered.length} of {TRANSPARENCY_PROJECTS.length} listings</span>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-stone-500">No public procurement listings match your filters.</div>
            ) : filtered.map((project, index) => (
              <article key={`${project.year}-${project.reference || project.title}-${index}`} className="p-4 sm:p-5 hover:bg-red-50/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-[#7A1315] border border-red-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-stone-100 text-stone-600">{project.year}</span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">{project.category}</span>
                    </div>
                    <h3 className="font-bold text-[#4D0C0D] leading-snug">{project.title}</h3>
                    {project.reference && <p className="text-xs text-stone-500 mt-1.5">Contract / Reference No.: <span className="font-semibold text-stone-700">{project.reference}</span></p>}
                    <p className="text-xs text-stone-500 mt-2 flex items-start gap-1.5"><TrendingUp className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" /> Publicly listed procurement project</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-900 leading-relaxed">
          <strong>Transparency note:</strong> The project entries above are based on the publicly available MSU-Gensan Bidding Documents page. A listing on that page indicates that the procurement was publicly posted, but it does <strong>not by itself confirm contract award, completion, or project success</strong>. Those statuses should only be displayed when supported by official award, contract, or completion records.
        </div>

        <div className="mt-4 text-center">
          <a href={TRANSPARENCY_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#7A1315] hover:underline">
            View the complete official MSU-Gensan bidding-document archive <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </main>
    </div>
  );
}
