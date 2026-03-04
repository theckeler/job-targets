"use client";

import { useCallback, useEffect, useState } from "react";

import type { CompanyWithJobs, Job } from "@/lib/db";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

const STATUS_CYCLE = ["new", "interested", "submitted", "skip"] as const;
type Status = (typeof STATUS_CYCLE)[number];

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-slate-100 text-slate-500",
  interested: "bg-violet-100 text-violet-700",
  submitted: "bg-emerald-100 text-emerald-700",
  skip: "bg-red-100 text-red-400",
};

const TIER_COLORS: Record<number, string> = {
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

type SortMode = "tier" | "jobs" | "alpha";

export default function TrackerPage() {
  const [companies, setCompanies] = useState<CompanyWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("tier");
  const [tierFilter, setTierFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [addingJobFor, setAddingJobFor] = useState<number | null>(null);
  const [newJobUrl, setNewJobUrl] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobSalary, setNewJobSalary] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/companies");
    const data = await res.json();
    setCompanies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const filtered = companies
    .filter((c) => {
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;
      if (statusFilter !== "all") {
        if (!c.jobs.some((j) => j.status === statusFilter)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) || c.tag?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "jobs")
        return (b.jobs?.length ?? 0) - (a.jobs?.length ?? 0);
      if (sortMode === "alpha") return a.name.localeCompare(b.name);
      return a.tier - b.tier || a.sort_order - b.sort_order;
    });

  const totalJobs = companies.reduce((n, c) => n + c.jobs.length, 0);
  const submittedCount = companies.reduce(
    (n, c) => n + c.jobs.filter((j) => j.status === "submitted").length,
    0,
  );
  const interestedCount = companies.reduce(
    (n, c) => n + c.jobs.filter((j) => j.status === "interested").length,
    0,
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

  async function addJob(companyId: number) {
    if (!newJobUrl && !newJobTitle) return;
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: companyId,
        url: newJobUrl,
        title: newJobTitle || "Untitled",
        salary_range: newJobSalary,
        date_applied: new Date().toISOString().split("T")[0],
      }),
    });
    setNewJobUrl("");
    setNewJobTitle("");
    setNewJobSalary("");
    setAddingJobFor(null);
    fetchData();
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm font-mono">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h1 className="text-base font-semibold text-slate-900">
              Job Tracker
            </h1>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-mono">
                {companies.length} cos
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-mono">
                {totalJobs} jobs
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-mono">
                {submittedCount} submitted
              </span>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-mono">
                {interestedCount} interested
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input
              className="h-8 text-sm w-44"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={sortMode}
              onValueChange={(v) => setSortMode(v as SortMode)}
            >
              <SelectTrigger className="h-8 text-sm w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tier">Sort: Tier</SelectItem>
                <SelectItem value="jobs">Sort: Job Count</SelectItem>
                <SelectItem value="alpha">Sort: A–Z</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(tierFilter)}
              onValueChange={(v) =>
                setTierFilter(v === "all" ? "all" : Number(v))
              }
            >
              <SelectTrigger className="h-8 text-sm w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="1">Dream</SelectItem>
                <SelectItem value="2">High</SelectItem>
                <SelectItem value="3">Good</SelectItem>
                <SelectItem value="4">Worth</SelectItem>
                <SelectItem value="5">Brand</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-sm w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="skip">Skip</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-2">
        {filtered.map((company, i) => {
          const isExpanded = expandedIds.has(company.id);
          const isAddingJob = addingJobFor === company.id;

          return (
            <div
              key={company.id}
              className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Company row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpand(company.id)}
              >
                <span className="font-mono text-xs text-slate-400 w-6 shrink-0">
                  {i + 1}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${TIER_COLORS[company.tier]}`}
                  title={TIER_LABELS[company.tier]}
                />

                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {company.name}
                  </a>
                  {company.tag && (
                    <span className="text-xs text-slate-400 hidden sm:block truncate max-w-xs">
                      {company.tag}
                    </span>
                  )}
                </div>

                {company.jobs.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs shrink-0"
                  >
                    {company.jobs.length}
                  </Badge>
                )}

                <a
                  href={company.careers_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-1 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0 font-mono"
                  onClick={(e) => e.stopPropagation()}
                >
                  careers →
                </a>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 text-slate-400 hover:text-slate-700 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddingJobFor(isAddingJob ? null : company.id);
                    if (!isExpanded) toggleExpand(company.id);
                  }}
                >
                  + job
                </Button>

                <span
                  className={`text-slate-300 text-xs transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                  {company.jobs.length > 0 && (
                    <div className="px-4 py-2 space-y-1">
                      {company.jobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center gap-2 py-1.5 group"
                        >
                          <div className="flex-1 min-w-0">
                            {job.url ? (
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-slate-700 hover:text-blue-600 transition-colors block truncate"
                              >
                                {job.title || job.url}
                              </a>
                            ) : (
                              <span className="text-sm text-slate-700 block truncate">
                                {job.title}
                              </span>
                            )}
                            {job.salary_range && (
                              <span className="text-xs text-slate-400 font-mono">
                                {job.salary_range}
                              </span>
                            )}
                          </div>
                          {job.date_applied && (
                            <span className="text-xs text-slate-400 font-mono shrink-0 hidden sm:block">
                              {job.date_applied}
                            </span>
                          )}
                          <button
                            onClick={() => cycleJobStatus(job)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer shrink-0 transition-colors ${STATUS_STYLES[job.status as Status] ?? STATUS_STYLES.new}`}
                          >
                            {job.status}
                          </button>
                          <button
                            onClick={() => deleteJob(job.id)}
                            className="text-slate-200 hover:text-red-400 transition-colors text-sm leading-none opacity-0 group-hover:opacity-100"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAddingJob && (
                    <div className="px-4 py-3 border-t border-slate-100 flex gap-2 flex-wrap items-center">
                      <Input
                        className="h-8 text-sm flex-1 min-w-36"
                        placeholder="Job title"
                        value={newJobTitle}
                        onChange={(e) => setNewJobTitle(e.target.value)}
                        autoFocus
                      />
                      <Input
                        className="h-8 text-sm flex-1 min-w-48"
                        placeholder="Job URL"
                        value={newJobUrl}
                        onChange={(e) => setNewJobUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addJob(company.id);
                        }}
                      />
                      <Input
                        className="h-8 text-sm w-36"
                        placeholder="Salary range"
                        value={newJobSalary}
                        onChange={(e) => setNewJobSalary(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => addJob(company.id)}
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => {
                          setAddingJobFor(null);
                          setNewJobUrl("");
                          setNewJobTitle("");
                          setNewJobSalary("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {company.jobs.length === 0 && !isAddingJob && (
                    <div className="px-4 py-3 text-xs text-slate-400">
                      No jobs yet.{" "}
                      <button
                        className="text-blue-500 hover:underline"
                        onClick={() => setAddingJobFor(company.id)}
                      >
                        Add one
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No companies match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
