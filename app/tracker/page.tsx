"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanyWithJobs, Job } from "@/lib/db";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";

const STATUS_CYCLE = ["new", "interested", "submitted", "skip"] as const;
type Status = (typeof STATUS_CYCLE)[number];

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-slate-100 text-slate-500",
  interested: "bg-violet-100 text-violet-700",
  submitted: "bg-emerald-100 text-emerald-700",
  skip: "bg-red-100 text-red-400",
};

const TIER_DOT: Record<number, string> = {
  1: "bg-blue-500",
  2: "bg-emerald-500",
  3: "bg-amber-500",
  4: "bg-orange-500",
  5: "bg-slate-400",
};

const TIER_LABELS: Record<number, string> = {
  1: "Dream",
  2: "High",
  3: "Good",
  4: "Worth",
  5: "Brand",
};

type AddJobSheet = {
  companyId: number;
  companyName: string;
};

export default function TrackerPage() {
  const [companies, setCompanies] = useState<CompanyWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Add job sheet
  const [sheet, setSheet] = useState<AddJobSheet | null>(null);
  const [newJobUrl, setNewJobUrl] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobSalary, setNewJobSalary] = useState("");
  const [saving, setSaving] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/companies");
    const data = await res.json();
    setCompanies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (sheet) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [sheet]);

  const filtered = companies
    .filter((c) => {
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;
      if (statusFilter !== "all") {
        if (!c.jobs.some((j) => j.status === statusFilter)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.tag?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.tier - b.tier || a.sort_order - b.sort_order);

  const totalJobs = companies.reduce((n, c) => n + c.jobs.length, 0);
  const submittedCount = companies.reduce(
    (n, c) => n + c.jobs.filter((j) => j.status === "submitted").length,
    0
  );

  async function cycleJobStatus(job: Job) {
    const idx = STATUS_CYCLE.indexOf(job.status as Status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, status: next }),
    });
    fetchData();
  }

  async function deleteJob(jobId: number) {
    await fetch(`/api/jobs?id=${jobId}`, { method: "DELETE" });
    fetchData();
  }

  async function addJob() {
    if (!sheet) return;
    if (!newJobUrl && !newJobTitle) return;
    setSaving(true);
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: sheet.companyId,
        url: newJobUrl || null,
        title: newJobTitle || "Untitled",
        salary_range: newJobSalary || null,
        date_applied: new Date().toISOString().split("T")[0],
        status: "new",
      }),
    });
    setNewJobUrl("");
    setNewJobTitle("");
    setNewJobSalary("");
    setSheet(null);
    setSaving(false);
    // Auto-expand the company
    setExpandedIds((prev) => new Set(prev).add(sheet.companyId));
    fetchData();
  }

  function openSheet(company: CompanyWithJobs) {
    setSheet({ companyId: company.id, companyName: company.name });
    if (!expandedIds.has(company.id)) {
      setExpandedIds((prev) => new Set(prev).add(company.id));
    }
  }

  function closeSheet() {
    setSheet(null);
    setNewJobUrl("");
    setNewJobTitle("");
    setNewJobSalary("");
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm font-mono">loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-950 pb-24">

        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-20 px-4 pt-safe pt-3 pb-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-semibold text-slate-100 tracking-tight">
              Job Tracker
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">{totalJobs} jobs</span>
              <span className="text-xs font-mono text-emerald-500">{submittedCount} out</span>
            </div>
          </div>

          {/* Search */}
          <Input
            className="h-9 text-sm bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 mb-3"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Tier pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(["all", 1, 2, 3, 4, 5] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  tierFilter === t
                    ? "bg-slate-100 text-slate-900"
                    : "bg-slate-800 text-slate-400 active:bg-slate-700"
                }`}
              >
                {t === "all" ? "All" : TIER_LABELS[t]}
              </button>
            ))}
            <div className="w-px shrink-0 bg-slate-800 mx-0.5" />
            {(["all", "new", "interested", "submitted", "skip"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-slate-100 text-slate-900"
                    : "bg-slate-800 text-slate-400 active:bg-slate-700"
                }`}
              >
                {s === "all" ? "Any status" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Company list */}
        <div className="px-3 py-3 space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-center py-16 text-slate-600 text-sm">
              No companies match.
            </p>
          )}

          {filtered.map((company) => {
            const isExpanded = expandedIds.has(company.id);

            return (
              <div
                key={company.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
              >
                {/* Company row */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-800 transition-colors"
                  onClick={() => toggleExpand(company.id)}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TIER_DOT[company.tier]}`} />

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-100 block truncate">
                      {company.name}
                    </span>
                    {company.tag && (
                      <span className="text-xs text-slate-500 block truncate">
                        {company.tag}
                      </span>
                    )}
                  </div>

                  {company.jobs.length > 0 && (
                    <span className="text-xs font-mono text-slate-500 shrink-0">
                      {company.jobs.length}
                    </span>
                  )}

                  <button
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 active:bg-slate-700 text-base leading-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSheet(company);
                    }}
                  >
                    +
                  </button>

                  <span className={`text-slate-600 text-xs transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </div>

                {/* Expanded jobs */}
                {isExpanded && (
                  <div className="border-t border-slate-800">
                    {company.jobs.length === 0 ? (
                      <div className="px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-slate-600">No jobs yet.</span>
                        <button
                          className="text-xs text-blue-500"
                          onClick={() => openSheet(company)}
                        >
                          Add one
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {company.jobs.map((job) => (
                          <div key={job.id} className="px-4 py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              {job.url ? (
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-slate-300 block truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {job.title || job.url}
                                </a>
                              ) : (
                                <span className="text-sm text-slate-300 block truncate">
                                  {job.title}
                                </span>
                              )}
                              {job.salary_range && (
                                <span className="text-xs text-slate-500 font-mono">
                                  {job.salary_range}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => cycleJobStatus(job)}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[job.status as Status] ?? STATUS_STYLES.new}`}
                              >
                                {job.status}
                              </button>
                              <button
                                onClick={() => deleteJob(job.id)}
                                className="text-slate-700 active:text-red-400 text-lg leading-none w-6 h-6 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Careers link */}
                    {company.careers_url && (
                      <div className="px-4 py-2.5 border-t border-slate-800">
                        <a
                          href={company.careers_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-500 active:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          careers page →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add job sheet */}
      {sheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
            onClick={closeSheet}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 rounded-t-2xl px-5 pb-safe pb-8 pt-5">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
            <p className="text-xs text-slate-500 mb-4 font-medium uppercase tracking-wide">
              {sheet.companyName}
            </p>
            <div className="space-y-3">
              <Input
                ref={urlInputRef}
                className="h-11 text-sm bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                placeholder="Job URL (paste here)"
                value={newJobUrl}
                onChange={(e) => setNewJobUrl(e.target.value)}
              />
              <Input
                className="h-11 text-sm bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                placeholder="Title (optional)"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
              />
              <Input
                className="h-11 text-sm bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                placeholder="Salary range (optional)"
                value={newJobSalary}
                onChange={(e) => setNewJobSalary(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addJob()}
              />
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 h-11 bg-white text-slate-900 hover:bg-slate-100"
                  onClick={addJob}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 px-5 text-slate-500"
                  onClick={closeSheet}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
