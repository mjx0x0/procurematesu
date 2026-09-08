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

  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.replace("/auth/login"); return; } const { data: profile } = await supabase.from("users").select("role,is_active").eq("id", user.id).maybeSingle(); if (!profile || profile.role !== "admin" || profile.is_active === false) { router.replace("/dashboard"); return; } const { data } = await supabase.from("ai_response_evaluations").select("id,test_name,score,created_at,notes").order("created_at", { ascending: false }).limit(30); setHistory((data || []) as Evaluation[]); setLoading(false); })().catch(() => setLoading(false)); }, [router]);

  const run = async () => { setRunning(true); setError(""); try { const { data: { session } } = await supabase.auth.getSession(); const headers: Record<string,string> = { "Content-Type": "application/json" }; if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`; const r = await fetch("/api/admin/ai-evaluation", { method: "POST", headers, credentials: "include", body: "{}" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Evaluation failed"); setResults(d.results || []); setAverage(d.averageScore ?? null); const refreshed = await supabase.from("ai_response_evaluations").select("id,test_name,score,created_at,notes").order("created_at", { ascending: false }).limit(30); setHistory((refreshed.data || []) as Evaluation[]); } catch (e: any) { setError(e.message || "Unable to run evaluation."); } finally { setRunning(false); } };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]"><Loader2 className="h-9 w-9 animate-spin text-[#7C1D2E]" /></div>;
  return <div className="min-h-screen bg-[#F9F7F4] text-gray-800">
    <nav className="bg-white/95 border-b border-stone-200 sticky top-0 z-40"><div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="bg-[#7C1D2E] p-2 rounded-xl text-[#D4A843]"><Bot className="h-5 w-5" /></div><b className="text-xl text-[#5A1420]">Procuremate<span className="text-[#D4A843]">SU</span></b><span className="text-xs bg-red-50 text-[#7C1D2E] border border-red-200 px-2 py-1 rounded-full font-semibold">AI Evaluation</span></div><Link href="/admin" className="text-sm text-stone-600 hover:text-[#7C1D2E] flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Back to Admin</Link></div></nav>
    <main className="max-w-6xl mx-auto px-4 py-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"><div><h1 className="text-3xl font-extrabold text-[#5A1420]">AI Response Evaluation</h1><p className="text-stone-600 mt-1">Run a repeatable procurement-question test set to check retrieval grounding, expected concept coverage, and source availability.</p></div><button onClick={run} disabled={running} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C1D2E] text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"><Play className="h-4 w-4" />{running ? "Running tests..." : "Run Evaluation Suite"}</button></div>
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
      {average !== null && <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 mb-6"><div className="text-xs uppercase tracking-wider text-stone-500 font-bold">Latest evaluation score</div><div className="text-4xl font-extrabold text-[#5A1420] mt-1">{average}%</div><div className="text-xs text-stone-500 mt-1">Composite score: expected-concept coverage 55%, retrieval grounding 25%, sources 10%, response availability 10%.</div></div>}
      {results.length > 0 && <section className="space-y-3 mb-8">{results.map(r => <article key={r.test_name} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><h2 className="font-bold text-[#5A1420]">{r.test_name}</h2><p className="text-sm text-stone-600 mt-1">{r.question}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold border ${r.score >= 80 ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{r.score}%</span></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs"><div className="rounded-lg bg-stone-50 p-2">Keyword coverage<br/><b>{r.keyword_coverage.toFixed(0)}%</b></div><div className="rounded-lg bg-stone-50 p-2">Retrieval<br/><b>{r.retrieval_grounded ? "Grounded" : "Missing"}</b></div><div className="rounded-lg bg-stone-50 p-2">Sources<br/><b>{r.sources_present ? "Present" : "Missing"}</b></div><div className="rounded-lg bg-stone-50 p-2">Matched<br/><b>{r.matchedKeywords?.length || 0}</b></div></div><details className="mt-4"><summary className="cursor-pointer text-xs font-semibold text-[#7C1D2E]">Inspect response</summary><div className="mt-3 rounded-lg bg-[#FBF7F2] p-3 text-sm whitespace-pre-wrap">{r.response || "No response returned."}</div><p className="text-xs text-stone-500 mt-2">{r.notes}</p></details></article>)}</section>}
      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-stone-200 flex items-center gap-2 font-bold text-[#5A1420]"><ShieldCheck className="h-4 w-4" />Evaluation History</div><div className="divide-y divide-stone-100">{history.map(h => <div key={h.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm"><div><b>{h.test_name}</b><div className="text-xs text-stone-500">{new Date(h.created_at).toLocaleString()}</div></div><span className={`font-bold ${Number(h.score) >= 80 ? "text-green-700" : "text-amber-700"}`}>{Number(h.score).toFixed(0)}%</span></div>)}{history.length === 0 && <div className="p-8 text-center text-sm text-stone-500 flex flex-col items-center gap-2"><TriangleAlert className="h-5 w-5" />No evaluation runs yet.</div>}</div></section>
      <p className="text-xs text-stone-500 mt-4">This is an engineering evaluation aid, not a legal certification of procurement answers. Final answers should remain grounded in authorized MSU procurement references.</p>
    </main>
  </div>;
}
