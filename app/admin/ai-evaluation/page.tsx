"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Bot, CheckCircle, ChevronDown, Loader2, LogOut, Play, ShieldCheck, TriangleAlert, User } from "lucide-react";

interface Result { test_name: string; question: string; response: string; score: number; keyword_coverage: number; retrieval_grounded: boolean; sources_present: boolean; notes: string; sources?: string[]; matchedKeywords?: string[]; }
interface Evaluation { id: string; test_name: string; score: number; created_at: string; notes: string | null; }

export default function AIEvaluationPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [history, setHistory] = useState<Evaluation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  useEffect(() => {
    (async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }
      if (!user) { router.replace("/"); return; }
      const { data: profile } = await supabase.from("users").select("role,is_active").eq("id", user.id).maybeSingle();
      if (!profile || profile.role !== "admin" || profile.is_active === false) { router.replace("/dashboard"); return; }
      setCurrentUser(user);
      const { data } = await supabase.from("ai_response_evaluations").select("id,test_name,score,created_at,notes").order("created_at", { ascending: false }).limit(30);
      setHistory((data || []) as Evaluation[]);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [router]);

  const run = async () => { setRunning(true); setError(""); try { const { data: { session } } = await supabase.auth.getSession(); const headers: Record<string,string> = { "Content-Type": "application/json" }; if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`; const r = await fetch("/api/admin/ai-evaluation", { method: "POST", headers, credentials: "include", body: "{}" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Evaluation failed"); setResults(d.results || []); setAverage(d.averageScore ?? null); const refreshed = await supabase.from("ai_response_evaluations").select("id,test_name,score,created_at,notes").order("created_at", { ascending: false }).limit(30); setHistory((refreshed.data || []) as Evaluation[]); } catch (e: any) { setError(e.message || "Unable to run evaluation."); } finally { setRunning(false); } };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]"><Loader2 className="h-9 w-9 animate-spin text-[#7B0046]" /></div>;
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl text-stone-500 hover:text-[#7B0046] hover:bg-stone-100 transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-[#4D002C] p-2 rounded-xl text-amber-300 shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <b className="text-xl font-black text-[#4D002C]">
                AI <span className="text-[#F5AB26]">Evaluation</span>
              </b>
            </div>
          </div>
          <div ref={adminMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAdminMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 transition hover:bg-stone-50 hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#7B0046]/20 cursor-pointer"
              aria-expanded={adminMenuOpen}
              aria-label="Admin account menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7B0046]/10 text-[10px] font-bold text-[#7B0046]">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline font-medium text-xs max-w-[170px] truncate text-stone-800">
                {currentUser?.email || "procurement@msugensan.edu.ph"}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${adminMenuOpen ? "rotate-180 text-[#7B0046]" : ""}`} />
            </button>

            {adminMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(45,25,20,0.12)]">
                <div className="border-b border-stone-100 px-3 py-2.5">
                  <p className="truncate text-xs font-bold text-stone-900">{currentUser?.email || "Procurement Admin"}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-[#7B0046] border border-red-200/60">
                      Administrator
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#4D002C]">AI Response Evaluation</h1>
            <p className="text-sm text-stone-600 mt-1">
              Run automated test questions to benchmark Isko BidDo retrieval grounding, concept coverage, and statutory references.
            </p>
          </div>
          <button
            onClick={run}
            disabled={running}
            className="ui-button ui-button-primary text-xs py-2.5 px-4 disabled:opacity-60"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
            ) : (
              <Play className="h-4 w-4 text-amber-300" />
            )}
            {running ? "Running Test Suite..." : "Run Evaluation Suite"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm font-medium">
            {error}
          </div>
        )}

        {average !== null && (
          <div className="ui-card p-5 mb-6 border-amber-200/80 bg-gradient-to-br from-white to-amber-50/20">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">
              Latest Composite Score
            </div>
            <div className="text-4xl font-black text-[#4D002C] mt-1">{average}%</div>
            <div className="text-xs text-stone-500 mt-1 font-medium">
              Weighted breakdown: expected-concept coverage 55%, retrieval grounding 25%, sources 10%, response availability 10%.
            </div>
          </div>
        )}

        {results.length > 0 && (
          <section className="space-y-4 mb-8">
            {results.map((r) => (
              <article key={r.test_name} className="ui-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-[#4D002C] text-base">{r.test_name}</h2>
                    <p className="text-sm text-stone-600 mt-1 font-medium">{r.question}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold border ${
                      r.score >= 80
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {r.score}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                    <span className="text-stone-500">Keyword Coverage</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">{r.keyword_coverage.toFixed(0)}%</div>
                  </div>
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                    <span className="text-stone-500">Retrieval Grounded</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">{r.retrieval_grounded ? "Grounded" : "Missing"}</div>
                  </div>
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                    <span className="text-stone-500">Sources Included</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">{r.sources_present ? "Present" : "Missing"}</div>
                  </div>
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                    <span className="text-stone-500">Matched Concepts</span>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">{r.matchedKeywords?.length || 0}</div>
                  </div>
                </div>

                <details className="mt-4 pt-3 border-t border-stone-100">
                  <summary className="cursor-pointer text-xs font-bold text-[#7B0046] hover:text-[#4D002C]">
                    Inspect AI Response Output
                  </summary>
                  <div className="mt-3 rounded-xl bg-stone-50 border border-stone-200 p-3.5 text-xs whitespace-pre-wrap text-stone-800 font-mono leading-relaxed">
                    {r.response || "No response returned."}
                  </div>
                  <p className="text-xs text-stone-500 mt-2 font-medium">{r.notes}</p>
                </details>
              </article>
            ))}
          </section>
        )}

        <section className="ui-card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/50 flex items-center gap-2 font-bold text-[#4D002C]">
            <ShieldCheck className="h-4 w-4 text-[#F5AB26]" />
            <span>Evaluation History</span>
          </div>
          <div className="divide-y divide-stone-100">
            {history.map((h) => (
              <div key={h.id} className="px-5 py-3.5 flex items-center justify-between gap-3 text-sm hover:bg-stone-50/50 transition-colors">
                <div>
                  <b className="text-[#4D002C]">{h.test_name}</b>
                  <div className="text-xs text-stone-400 mt-0.5">{new Date(h.created_at).toLocaleString("en-PH")}</div>
                </div>
                <span className={`font-black text-sm ${Number(h.score) >= 80 ? "text-emerald-700" : "text-amber-700"}`}>
                  {Number(h.score).toFixed(0)}%
                </span>
              </div>
            ))}
            {history.length === 0 && (
              <div className="p-8 text-center text-sm text-stone-500 flex flex-col items-center gap-2">
                <TriangleAlert className="h-6 w-6 text-stone-300" />
                <p className="font-semibold">No evaluation runs recorded yet.</p>
                <p className="text-xs text-stone-400">Click &quot;Run Evaluation Suite&quot; above to initiate a benchmark.</p>
              </div>
            )}
          </div>
        </section>
        <p className="text-xs text-stone-400 mt-4 italic">
          * This is an automated benchmarking aid to evaluate retrieval fidelity, not a legal certification.
        </p>
      </main>
    </div>
  );
}
