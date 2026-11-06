"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { TRANSPARENCY_PROJECTS, TRANSPARENCY_SOURCE_URL } from "@/lib/transparency-projects";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";

const YEARS = [2026, 2025, 2024, 2023, 2022] as const;
const CATEGORIES = [
  "All",
  "Infrastructure",
  "Goods & Equipment",
  "Services",
  "ICT",
  "Research & Laboratory",
  "Agriculture & Development",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

const categoryColor = (cat: string) => {
  switch (cat) {
    case "Infrastructure":
      return "bg-amber-50 text-amber-800 border-amber-200/70";
    case "ICT":
      return "bg-blue-50 text-blue-800 border-blue-200/70";
    case "Research & Laboratory":
      return "bg-purple-50 text-purple-800 border-purple-200/70";
    case "Goods & Equipment":
      return "bg-emerald-50 text-emerald-800 border-emerald-200/70";
    case "Agriculture & Development":
      return "bg-lime-50 text-lime-800 border-lime-200/70";
    case "Services":
      return "bg-cyan-50 text-cyan-800 border-cyan-200/70";
    default:
      return "bg-stone-100 text-stone-700 border-stone-200/70";
  }
};

export default function TransparencyPage() {
  const [year, setYear] = useState<number | "all">("all");
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRANSPARENCY_PROJECTS.filter((project) => {
      const matchesYear = year === "all" || project.year === year;
      const matchesCategory = category === "All" || project.category === category;
      const matchesSearch =
        !q || `${project.title} ${project.reference || ""} ${project.category}`.toLowerCase().includes(q);
      return matchesYear && matchesCategory && matchesSearch;
    });
  }, [year, category, query]);

  const counts = useMemo(
    () => ({
      total: TRANSPARENCY_PROJECTS.length,
      infrastructure: TRANSPARENCY_PROJECTS.filter((p) => p.category === "Infrastructure").length,
      ict: TRANSPARENCY_PROJECTS.filter((p) => p.category === "ICT").length,
      research: TRANSPARENCY_PROJECTS.filter(
        (p) => p.category === "Research & Laboratory" || p.category === "Goods & Equipment"
      ).length,
    }),
    []
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <SystemPageHeader
        titlePrimary="Transparency"
        titleAccent="Board"
        backHref="/dashboard"
        roleLabel="End User"
        containerClassName="max-w-7xl px-4 sm:px-6"
      />

      <main className="max-w-7xl mx-auto px-3.5 py-4 sm:px-6 sm:py-7">
        {/* Simple & Clean Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[#4D002C]">
              Procurement Transparency Board
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
              Publicly listed procurement projects, bidding opportunities, and official disclosures of Mindanao State University – General Santos.
            </p>
          </div>
          <a
            href={TRANSPARENCY_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-[#7B0046] shadow-xs hover:bg-[#FDF2F7] hover:border-[#7B0046]/40 transition-all shrink-0 self-start sm:self-auto"
          >
            <span>Official Bidding Archive</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl sm:text-2xl font-black text-[#4D002C] font-mono leading-none">
                  {counts.total}
                </div>
                <div className="text-xs font-bold text-stone-700 mt-1">Total Notices</div>
                <div className="text-[11px] text-stone-400 font-medium">Public project listings</div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7B0046]/10 text-[#7B0046]">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono leading-none">
                  {counts.infrastructure}
                </div>
                <div className="text-xs font-bold text-stone-700 mt-1">Infrastructure</div>
                <div className="text-[11px] text-stone-400 font-medium">Campus facilities &amp; works</div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono leading-none">
                  {counts.ict}
                </div>
                <div className="text-xs font-bold text-stone-700 mt-1">ICT &amp; Systems</div>
                <div className="text-[11px] text-stone-400 font-medium">Digital infrastructure</div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60">
                <Cpu className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono leading-none">
                  {counts.research}
                </div>
                <div className="text-xs font-bold text-stone-700 mt-1">Goods &amp; Lab</div>
                <div className="text-[11px] text-stone-400 font-medium">Research &amp; equipment</div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-3 sm:p-4 mb-4 sm:mb-5 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by project title, contract/reference number, or category..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 text-sm outline-none focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm font-medium focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 cursor-pointer"
            >
              <option value="all">All Years ({TRANSPARENCY_PROJECTS.length})</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y} ({TRANSPARENCY_PROJECTS.filter((p) => p.year === y).length})
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm font-medium focus:border-[#7B0046] focus:ring-2 focus:ring-[#7B0046]/15 cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>

            {(query || year !== "all" || category !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setYear("all");
                  setCategory("All");
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Directory Listing Container */}
        <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
          <div className="px-4 sm:px-6 py-3.5 border-b border-stone-200/80 bg-stone-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[#4D002C]">Public Project Directory</h2>
              <span className="text-xs text-stone-500 font-medium">
                ({filtered.length} {filtered.length === 1 ? "record" : "records"})
              </span>
            </div>
            <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
              Official University Disclosures
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <FileText className="h-10 w-10 mx-auto text-stone-300 mb-2" />
                <p className="font-semibold text-stone-800">No procurement listings found.</p>
                <p className="text-xs text-stone-400 mt-1">
                  Try adjusting your search query or selecting a different year/category.
                </p>
              </div>
            ) : (
              filtered.map((project, index) => {
                return (
                  <article
                    key={`${project.year}-${project.reference || project.title}-${index}`}
                    className="p-4 sm:p-5 hover:bg-[#FFFDF7] transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            {project.year}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${categoryColor(
                              project.category
                            )}`}
                          >
                            {project.category}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                            Public Notice
                          </span>
                        </div>

                        <h3 className="font-bold text-sm sm:text-base text-stone-900 leading-snug">
                          {project.title}
                        </h3>

                        {project.reference && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs text-stone-500">
                            <span className="font-medium">Contract / Ref:</span>
                            <span className="font-mono font-bold text-[#7B0046] bg-[#7B0046]/5 border border-[#7B0046]/15 px-2 py-0.5 rounded text-[11px] select-all">
                              {project.reference}
                            </span>
                          </div>
                        )}
                    </div>

                    <div className="shrink-0 pt-2 sm:pt-0 sm:self-center border-t border-stone-100 sm:border-0 flex items-center justify-between sm:justify-end gap-2">
                      <a
                        href={TRANSPARENCY_SOURCE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#7B0046] hover:text-[#4D002C] px-3 py-1.5 rounded-lg hover:bg-[#7B0046]/10 transition-colors"
                      >
                        <span>View Source</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Transparency Notice Banner */}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 flex items-start gap-3.5 text-xs sm:text-sm text-amber-950 leading-relaxed shadow-2xs">
          <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Official Transparency Notice</p>
            <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
              The project entries above are based on the publicly available MSU-Gensan Bidding Documents page. A listing on that page indicates that the procurement was publicly posted, but it does{" "}
              <strong>not by itself confirm contract award, completion, or project success</strong>. Those statuses are only official when supported by signed award, contract, or completion documentation.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
