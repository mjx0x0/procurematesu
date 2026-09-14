"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Bot, CheckCircle, Loader2, Play, ShieldCheck, TriangleAlert } from "lucide-react";

interface Result { test_name: string; question: string; response: string; score: number; keyword_coverage: number; retrieval_grounded: boolean; sources_present: boolean; notes: string; sources?: string[]; matchedKeywords?: string[]; }
interface Evaluation { id: string; test_name: string; score: number; created_at: string; notes: string | null; }

export default function AIEvaluationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [history, setHistory] = useState<Evaluation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }
      if (!user) { router.replace("/auth/login"); return; }
      const { data: profile } = await supabase.from("users").select("role,is_active").eq("id", user.id).maybeSingle();
      if (!profile || profile.role !== "admin" || profile.is_active === false) { router.replace("/dashboard"); return; }
      const { data } = await supabase.from("ai_response_evaluations").select("id,test_name,score,created_at,notes").order("created_at", { ascending: false }).limit(30);
      setHistory((data || []) as Evaluation[]);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [router]);

  const run = async () => { setRunning(true); setError(""); try { const { data: { session } } = await supabase.auth.getSession(); const headers: Record<string,string> = { "Content-Type": "application/json" }; if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`; const r = await fetch("/api/admin/ai-evaluation", { method: "POST", headers, credentials: "include", body: "{}" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Evaluation failed"); setResults(d.results || []); setAverage(d.averageScore ?? null); const refreshed = await supabase.from("ai_response_evaluations").select("id,test_name,score,created_at,notes").order("created_at", { ascending: false }).limit(30); setHistory((refreshed.data || []) as Evaluation[]); } catch (e: any) { setError(e.message || "Unable to run evaluation."); } finally { setRunning(false); } };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]"><Loader2 className="h-9 w-9 animate-spin text-[#7C1D2E]" /></div>;
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800">
      <nav className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl text-stone-500 hover:text-[#7A1315] hover:bg-stone-100 transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-[#4D0C0D] p-2 rounded-xl text-amber-300 shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <b className="text-xl font-black text-[#4D0C0D]">
                  AI <span className="text-[#B88E13]">Evaluation</span>
                </b>
                <span className="text-[11px] bg-red-50 text-[#7A1315] border border-red-200/80 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Admin Tool
                </span>
              </div>
              <p className="text-[10px] text-stone-500">Benchmark Isko BidDo AI accuracy, concept coverage, and grounding</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs font-bold text-stone-600 hover:text-[#7A1315] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#4D0C0D]">AI Response Evaluation</h1>
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
            <div className="text-4xl font-black text-[#4D0C0D] mt-1">{average}%</div>
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
                    <h2 className="font-bold text-[#4D0C0D] text-base">{r.test_name}</h2>
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
                  <summary className="cursor-pointer text-xs font-bold text-[#7A1315] hover:text-[#4D0C0D]">
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
          <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/50 flex items-center gap-2 font-bold text-[#4D0C0D]">
            <ShieldCheck className="h-4 w-4 text-[#B88E13]" />
            <span>Evaluation History</span>
          </div>
          <div className="divide-y divide-stone-100">
            {history.map((h) => (
              <div key={h.id} className="px-5 py-3.5 flex items-center justify-between gap-3 text-sm hover:bg-stone-50/50 transition-colors">
                <div>
                  <b className="text-[#4D0C0D]">{h.test_name}</b>
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
