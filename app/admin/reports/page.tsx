"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isStaleRefreshTokenError } from "@/lib/supabase/client";
import { SystemPageHeader } from "@/components/dashboard/SystemPageHeader";
import LoadingScreen from "@/components/LoadingScreen";
import { PROCUREMENT_STAGES, TERMINAL_STAGES } from "@/lib/procurement-process";
import { BarChart3, Download, Printer, RefreshCw, FileText, Layers3, CircleDollarSign, CheckCircle2 } from "lucide-react";

interface ReportPR {
  pr_no: string;
  purpose: string | null;
  department: string | null;
  total: number | string | null;
  current_stage: string | null;
  created_at: string;
  updated_at: string | null;
}

type DateRange = "30d" | "90d" | "ytd" | "all";

const RANGE_LABELS: Record<DateRange, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "Year to date",
  all: "All time",
};

function formatMoney(value: number) {
  return "₱" + value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function csvCell(value: unknown) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [prs, setPrs] = useState<ReportPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("90d");

  const loadReportData = useCallback(async () => {
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        await supabase.auth.signOut().catch(() => {});
        router.replace("/");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role,is_active,status")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        profile?.role !== "admin" ||
        profile?.is_active !== true ||
        profile?.status !== "approved"
      ) {
        router.replace("/dashboard");
        return;
      }

      const allRows: ReportPR[] = [];
      const pageSize = 1000;
      for (let offset = 0; offset < 100000; offset += pageSize) {
        const { data, error: queryError } = await supabase
          .from("purchase_requests")
          .select("pr_no,purpose,department,total,current_stage,created_at,updated_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (queryError) throw queryError;
        const pageRows = (data || []) as ReportPR[];
        allRows.push(...pageRows);
        if (pageRows.length < pageSize) break;
      }

      setPrs(allRows);
    } catch (loadError) {
      if (!isStaleRefreshTokenError(loadError)) {
        console.error("Unable to load procurement reports:", loadError);
      }
      setError("Procurement reports could not be loaded. Please refresh the page.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const filteredPRs = useMemo(() => {
    if (range === "all") return prs;

    const now = new Date();
    const start = new Date(now);
    if (range === "30d") start.setDate(now.getDate() - 29);
    if (range === "90d") start.setDate(now.getDate() - 89);
    if (range === "ytd") start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    return prs.filter((pr) => {
      const created = new Date(pr.created_at);
      return !Number.isNaN(created.getTime()) && created >= start && created <= now;
    });
  }, [prs, range]);

  const metrics = useMemo(() => {
    const total = filteredPRs.length;
    const totalEstimated = filteredPRs.reduce((sum, pr) => sum + Number(pr.total || 0), 0);
    const completed = filteredPRs.filter((pr) => pr.current_stage === "completed").length;
    const rejected = filteredPRs.filter((pr) => ["rejected", "cancelled"].includes(pr.current_stage || "")).length;
    const inProgress = total - completed - rejected;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const completedRows = filteredPRs.filter((pr) => pr.current_stage === "completed" && pr.updated_at);
    const averageCompletionDays = completedRows.length
      ? completedRows.reduce((sum, pr) => {
          const days = (new Date(pr.updated_at as string).getTime() - new Date(pr.created_at).getTime()) / 86400000;
          return sum + Math.max(0, days);
        }, 0) / completedRows.length
      : null;

    return { total, totalEstimated, completed, rejected, inProgress, completionRate, averageCompletionDays };
  }, [filteredPRs]);

  const monthlySubmissions = useMemo(() => {
    const now = new Date();
    const monthStarts = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return date;
    });
    return monthStarts.map((month) => {
      const key = month.getFullYear() + "-" + String(month.getMonth() + 1).padStart(2, "0");
      const count = filteredPRs.filter((pr) => {
        const date = new Date(pr.created_at);
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") === key;
      }).length;
      return {
        key,
        label: month.toLocaleDateString("en-PH", { month: "short" }),
        count,
      };
    });
  }, [filteredPRs]);

  const departmentRows = useMemo(() => {
    const groups = new Map<string, { requests: number; estimatedValue: number; completed: number; inProgress: number }>();
    for (const pr of filteredPRs) {
      const department = pr.department?.trim() || "Unspecified department";
      const current = groups.get(department) || { requests: 0, estimatedValue: 0, completed: 0, inProgress: 0 };
      current.requests += 1;
      current.estimatedValue += Number(pr.total || 0);
      if (pr.current_stage === "completed") current.completed += 1;
      else if (!TERMINAL_STAGES.includes(pr.current_stage as (typeof TERMINAL_STAGES)[number])) current.inProgress += 1;
      groups.set(department, current);
    }
    return [...groups.entries()]
      .map(([department, values]) => ({ department, ...values }))
      .sort((a, b) => b.estimatedValue - a.estimatedValue || b.requests - a.requests);
  }, [filteredPRs]);

  const stageRows = useMemo(() => {
    const rows = PROCUREMENT_STAGES.map((stage) => ({
      key: stage.key,
      label: "Stage " + stage.number + " · " + stage.shortLabel,
      count: filteredPRs.filter((pr) => pr.current_stage === stage.key).length,
    }));
    for (const terminal of ["completed", "rejected", "cancelled"] as const) {
      const count = filteredPRs.filter((pr) => pr.current_stage === terminal).length;
      if (count > 0) {
        rows.push({
          key: terminal,
          label: terminal === "completed" ? "Completed" : terminal === "rejected" ? "Rejected" : "Cancelled",
          count,
        });
      }
    }
    return rows.filter((row) => row.count > 0);
  }, [filteredPRs]);

  const exportCSV = () => {
    const header = ["PR Number", "Date Created", "Department", "Purpose", "Current Stage", "Total Estimated Value"];
    const rows = filteredPRs.map((pr) => [
      pr.pr_no,
      formatDate(pr.created_at),
      pr.department || "Unspecified department",
      pr.purpose || "",
      pr.current_stage || "Unspecified",
      Number(pr.total || 0).toFixed(2),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "procurement-report-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadReportData();
  };

  if (loading) return <LoadingScreen label="Loading procurement reports..." />;

  const maxMonthly = Math.max(1, ...monthlySubmissions.map((month) => month.count));

  return (
    <div className="min-h-screen bg-[#F9F7F4] text-gray-800 admin-dashboard-page">
      <SystemPageHeader
        titlePrimary="Procurement"
        titleAccent="Reports"
        icon={BarChart3}
        backHref="/admin"
        roleLabel="Administrator"
        containerClassName="max-w-7xl px-3.5 sm:px-6"
      />

      <main className="mx-auto max-w-7xl min-w-0 px-3.5 py-4 sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#4D002C] sm:text-3xl">
              Procurement Reports &amp; Analytics
            </h1>
            <p className="mt-1 text-xs text-stone-600 sm:text-sm">
              Monitor Purchase Request volume, workflow status, and estimated procurement value.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredPRs.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#7B0046] px-3 py-2 text-xs font-bold text-white hover:bg-[#610037] disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
          <span className="mr-1 text-xs font-bold text-stone-600">Reporting period</span>
          {(["30d", "90d", "ytd", "all"] as DateRange[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              aria-pressed={range === value}
              className={"rounded-lg border px-3 py-2 text-[11px] font-bold transition " + (
                range === value
                  ? "border-[#7B0046] bg-[#7B0046] text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              )}
            >
              {RANGE_LABELS[value]}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-stone-400">
            {filteredPRs.length.toLocaleString("en-PH")} records · {RANGE_LABELS[range]}
          </span>
        </div>

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: "Purchase Requests", value: metrics.total.toLocaleString("en-PH"), Icon: FileText, color: "text-[#7B0046]" },
            { label: "Total Estimated Value", value: formatMoney(metrics.totalEstimated), Icon: CircleDollarSign, color: "text-amber-700" },
            { label: "In Progress", value: metrics.inProgress.toLocaleString("en-PH"), Icon: Layers3, color: "text-blue-700" },
            { label: "Completed", value: metrics.completed.toLocaleString("en-PH"), Icon: CheckCircle2, color: "text-emerald-700" },
            { label: "Completion Rate", value: metrics.completionRate.toFixed(1) + "%", Icon: BarChart3, color: "text-[#7B0046]" },
          ].map(({ label, value, Icon, color }) => (
            <article key={label} className="min-w-0 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-[0_5px_20px_rgba(45,20,10,0.03)] sm:p-4">
              <Icon className={"mb-2 h-4 w-4 " + color} />
              <p className="break-words text-lg font-extrabold leading-tight text-stone-900 sm:text-xl">{value}</p>
              <p className="mt-1 text-[10px] font-semibold leading-snug text-stone-500 sm:text-xs">{label}</p>
            </article>
          ))}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_5px_20px_rgba(45,20,10,0.03)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-[#4D002C] sm:text-base">Monthly PR Submissions</h2>
                <p className="mt-0.5 text-[10px] text-stone-500">Requests created in each month within the selected period</p>
              </div>
              <BarChart3 className="h-5 w-5 text-[#7B0046]" />
            </div>
            <div className="flex h-44 items-end gap-2 border-b border-stone-200 px-1 pt-3">
              {monthlySubmissions.map((month) => (
                <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-bold text-stone-600">{month.count}</span>
                  <div className="flex h-[78%] w-full items-end justify-center">
                    <div
                      className="w-full max-w-12 rounded-t-md bg-[#7B0046]"
                      style={{ height: ((month.count / maxMonthly) * 100) + "%" }}
                      title={month.count + " PR submissions"}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-stone-500">{month.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_5px_20px_rgba(45,20,10,0.03)] sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-extrabold text-[#4D002C] sm:text-base">Current Workflow Distribution</h2>
              <p className="mt-0.5 text-[10px] text-stone-500">Current stage of each request in the selected period</p>
            </div>
            {stageRows.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-400">No requests in this reporting period.</p>
            ) : (
              <div className="space-y-3">
                {stageRows.slice(0, 8).map((stage) => (
                  <div key={stage.key}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] font-semibold text-stone-700">{stage.label}</span>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-stone-600">{stage.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-[#7B0046]" style={{ width: ((stage.count / Math.max(1, metrics.total)) * 100) + "%" }} />
                    </div>
                  </div>
                ))}
                {stageRows.length > 8 && (
                  <p className="pt-1 text-[10px] text-stone-400">Showing the 8 most active stages.</p>
                )}
              </div>
            )}
          </article>
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.03)]">
          <div className="border-b border-stone-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-extrabold text-[#4D002C] sm:text-base">Department Summary</h2>
            <p className="mt-0.5 text-[10px] text-stone-500">Request count and estimated value by requesting department</p>
          </div>
          {departmentRows.length === 0 ? (
            <p className="p-6 text-center text-xs text-stone-400">No department data for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Department</th>
                    <th className="px-4 py-3 text-right font-bold">Requests</th>
                    <th className="px-4 py-3 text-right font-bold">Estimated Value</th>
                    <th className="px-4 py-3 text-right font-bold">Completed</th>
                    <th className="px-4 py-3 text-right font-bold">In Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {departmentRows.map((row) => (
                    <tr key={row.department} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3 font-semibold text-stone-800">{row.department}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.requests}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[#7B0046]">{formatMoney(row.estimatedValue)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.completed}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.inProgress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_5px_20px_rgba(45,20,10,0.03)]">
          <div className="border-b border-stone-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-extrabold text-[#4D002C] sm:text-base">Purchase Request Register</h2>
            <p className="mt-0.5 text-[10px] text-stone-500">Detailed records included in the selected report</p>
          </div>
          {filteredPRs.length === 0 ? (
            <p className="p-6 text-center text-xs text-stone-400">No Purchase Requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">PR Number</th>
                    <th className="px-4 py-3 font-bold">Created</th>
                    <th className="px-4 py-3 font-bold">Department</th>
                    <th className="px-4 py-3 font-bold">Purpose</th>
                    <th className="px-4 py-3 font-bold">Current Stage</th>
                    <th className="px-4 py-3 text-right font-bold">Estimated Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPRs.slice(0, 50).map((pr) => (
                    <tr key={pr.pr_no} className="hover:bg-stone-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-[#4D002C]">{pr.pr_no}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-500">{formatDate(pr.created_at)}</td>
                      <td className="px-4 py-3 text-stone-700">{pr.department || "—"}</td>
                      <td className="max-w-[230px] truncate px-4 py-3 text-stone-600" title={pr.purpose || ""}>{pr.purpose || "—"}</td>
                      <td className="px-4 py-3 text-stone-600">{PROCUREMENT_STAGES.find((stage) => stage.key === pr.current_stage)?.shortLabel || pr.current_stage || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[#7B0046]">{formatMoney(Number(pr.total || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPRs.length > 50 && (
                <p className="border-t border-stone-100 px-4 py-2 text-[10px] text-stone-500">
                  Showing the latest 50 records on screen. Export CSV to download all {filteredPRs.length} matching records.
                </p>
              )}
            </div>
          )}
        </section>

        {metrics.averageCompletionDays !== null && (
          <p className="mt-4 text-[10px] text-stone-500">
            Average completion time among completed requests in this report: {metrics.averageCompletionDays.toFixed(1)} calendar days.
            Rejected and cancelled requests are excluded.
          </p>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-stone-400">
          Estimated values are taken from the Purchase Request records and are not actual expenditure, awarded amounts, or proof of payment.
        </p>
      </main>
    </div>
  );
}
