"use client";

import type { CompanyWithJobs, Job } from "@/lib/db";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { fetchData } from "@/util/fetchData";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STATUS_CYCLE = ["new", "interested", "submitted", "skip"] as const;
type Status = (typeof STATUS_CYCLE)[number];

const STATUS_STYLES: Record<Status, string> = {
  new: "text-purple-400 border-purple-400",
  interested: "text-yellow-400 border-yellow-400",
  submitted: "text-emerald-400 border-emerald-400",
  skip: "text-red-400 border-red-400",
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    title: string;
  } | null>(null);

  // Add job sheet
  const [sheet, setSheet] = useState<AddJobSheet | null>(null);
  const [newJobUrl, setNewJobUrl] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobSalary, setNewJobSalary] = useState("");
  const [saving, setSaving] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  async function loadCompanies(ignore: boolean) {
    const data = await fetchData("/api/companies");
    if (!ignore) {
      setCompanies(data);
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadCompanies(ignore);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (sheet) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [sheet]);

  const filtered = companies
    .filter((c) => {
      if (tierFilter !== "all" && Number(c.tier) !== tierFilter) return false;
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
    .sort((a, b) => a.tier - b.tier || a.sort_order - b.sort_order);

  const totalJobs = companies.reduce((n, c) => n + c.jobs.length, 0);
  const submittedCount = companies.reduce(
    (n, c) => n + c.jobs.filter((j) => j.status === "submitted").length,
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
    loadCompanies(false);
  }

  async function deleteJob() {
    if (!deleteConfirm) return;
    await fetch(`/api/jobs?id=${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    loadCompanies(false);
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
    setExpandedIds((prev) => new Set(prev).add(sheet.companyId));
    loadCompanies(false);
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
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">loading...</p>
      </div>
    );
  }

  const hasActiveFilter =
    tierFilter !== "all" || statusFilter !== "all" || search !== "";

  return (
    <>
      <div className="min-h-screen bg-[#0a0f1e] pb-24">
        <div className="bg-sky-600 p-2 pt-12">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 flex-col">
              <h1 className="text-lg font-bold tracking-tight leading-none">
                Job Tracker
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs">{totalJobs} tracked</span>
                <span className="text-xs">{submittedCount} submitted</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`relative flex items-center justify-center rounded bg-black border border-black p-2 ${hasActiveFilter ? "border-red-500 text-red-500" : "text-sky-300 border-transparent"}`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Company list */}
        <div className="p-2 space-y-2">
          {filtered.length === 0 && (
            <p className="text-center py-20 text-[#334155] text-sm font-mono">
              No companies match.
            </p>
          )}

          {filtered.map((company) => {
            const isExpanded = expandedIds.has(company.id);

            return (
              <div key={company.id} className="bg-slate-900 rounded">
                {/* Company row */}
                <div
                  className="flex justify-between items-center gap-2 px-2 py-3 cursor-pointer"
                  onClick={() => toggleExpand(company.id)}
                >
                  <div className="flex gap-2 items-center">
                    <span
                      className={`w-4 h-1 rounded-full shrink-0 ${TIER_DOT[company.tier]}`}
                    />

                    <div className="font-semibold text-white truncate leading-tight">
                      {company.name}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {company.jobs.length > 0 && (
                      <button
                        className={`min-w-12 p-2 select-none rounded text-xs ${isExpanded ? "border border-red-500 text-red-500" : "border border-white/30 text-white/30"}`}
                      >
                        {company.jobs.length}
                      </button>
                    )}

                    {company.careers_url && (
                      <a
                        href={company.careers_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 min-w-12 flex items-center justify-center text-yellow-500 text-xs border border-yellow-500 rounded p-2"
                      >
                        ↗
                      </a>
                    )}

                    <button
                      type="button"
                      className="shrink-0 flex items-center justify-center rounded min-w-12 leading-none text-green-300 border border-green-300 p-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSheet(company);
                      }}
                    >
                      +
                    </button>

                    <button
                      className={`min-w-12 p-2 select-none rounded text-xs ${isExpanded ? "rotate-180 border border-white/80 text-white/80" : "border border-white/30 text-white/30"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(company.id);
                      }}
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Expanded jobs */}
                {isExpanded && (
                  <div className="border-t border-[#1e293b]">
                    {company.jobs.length === 0 ? (
                      <div className="px-4 py-4 flex items-center justify-between">
                        <span className="text-xs text-orange-500 font-medium border border-orange-500 rounded px-2 py-1">
                          No jobs logged yet
                        </span>
                      </div>
                    ) : (
                      <div className="divide-y divide-sky-500/50">
                        {company.jobs.map((job) => (
                          <div
                            key={job.id}
                            className="p-2 flex items-start gap-1"
                          >
                            <div className="flex-1 min-w-0 gap-1 flex flex-col">
                              {job.url ? (
                                <a
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-white block truncate font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {job.title || job.url}
                                </a>
                              ) : (
                                <span className="text-sm text-white block truncate font-medium">
                                  {job.title}
                                </span>
                              )}
                              {job.salary_range && (
                                <div className="text-xs text-white/60">
                                  {job.salary_range}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => cycleJobStatus(job)}
                                className={`text-xs rounded border border-blue-400 font-medium flex items-center px-6 py-2 ${STATUS_STYLES[job.status as Status] ?? STATUS_STYLES.new}`}
                              >
                                {job.status}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirm({
                                    id: job.id,
                                    title: job.title || job.url || "this job",
                                  })
                                }
                                className="text-red-500 border p-2 rounded border-red-500 flex items-center justify-center min-w-12 text-xs"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="fixed z-50 left-4 right-4 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <p className="text-white font-semibold text-base mb-1">
              Delete job?
            </p>
            <p className="text-slate-400 text-sm mb-6 truncate">
              {deleteConfirm.title}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={deleteJob}
                className="flex-1 h-12 rounded-xl bg-red-500 text-white text-sm font-semibold active:bg-red-600"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-12 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold border border-slate-700 active:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Filter sheet */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a] border-t border-[#1e293b] rounded-t-2xl px-5 pb-safe pb-8 pt-5">
            <div className="w-10 h-1 bg-[#1e293b] rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-[#e2e8f0]">Filter</p>
              {hasActiveFilter && (
                <button
                  className="text-xs text-[#475569] font-mono"
                  onClick={() => {
                    setTierFilter("all");
                    setStatusFilter("all");
                    setSearch("");
                  }}
                >
                  clear all
                </button>
              )}
            </div>

            <Input
              className="h-11 text-sm bg-[#1e293b] border-[#334155] text-[#f1f5f9] placeholder:text-[#475569] rounded-xl mb-5"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">
              Tier
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {(["all", 1, 2, 3, 4, 5] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTierFilter(t)}
                  style={{ minHeight: 48 }}
                  className={`text-sm px-5 rounded-xl font-medium transition-colors ${
                    tierFilter === t
                      ? "bg-[#f1f5f9] text-[#0f172a]"
                      : "bg-[#1e293b] text-[#64748b] active:bg-[#334155]"
                  }`}
                >
                  {t === "all" ? "All" : TIER_LABELS[t]}
                </button>
              ))}
            </div>

            <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">
              Status
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {(["all", "new", "interested", "submitted", "skip"] as const).map(
                (s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={{ minHeight: 48 }}
                    className={`text-sm px-5 rounded-xl font-medium transition-colors ${
                      statusFilter === s
                        ? "bg-[#f1f5f9] text-[#0f172a]"
                        : "bg-[#1e293b] text-[#64748b] active:bg-[#334155]"
                    }`}
                  >
                    {s === "all" ? "Any" : s}
                  </button>
                ),
              )}
            </div>

            <Button
              className="w-full h-11 font-medium bg-[#f1f5f9] text-[#0f172a]"
              onClick={() => setFilterOpen(false)}
            >
              Done
            </Button>
          </div>
        </>
      )}

      {/* Add job sheet */}
      {sheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
            onClick={closeSheet}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a] border-t border-[#334155] rounded-t-2xl px-5 pb-safe pb-8 pt-5">
            <div className="w-10 h-1 bg-[#334155] rounded-full mx-auto mb-5" />
            <p className="text-xs text-[#64748b] mb-4 font-medium uppercase tracking-wide">
              {sheet.companyName}
            </p>
            <div className="space-y-3">
              <Input
                ref={urlInputRef}
                className="h-11 text-sm bg-[#1e293b] border-[#334155] text-[#f1f5f9] placeholder:text-[#64748b]"
                placeholder="Job URL (paste here)"
                value={newJobUrl}
                onChange={(e) => setNewJobUrl(e.target.value)}
              />
              <Input
                className="h-11 text-sm bg-[#1e293b] border-[#334155] text-[#f1f5f9] placeholder:text-[#64748b]"
                placeholder="Title (optional)"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
              />
              <Input
                className="h-11 text-sm bg-[#1e293b] border-[#334155] text-[#f1f5f9] placeholder:text-[#64748b]"
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
                  className="h-11 px-5 text-[#64748b]"
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
