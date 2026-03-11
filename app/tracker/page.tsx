"use client";

import type { CompanyWithJobs, Job } from "@/lib/db";
import Modal from "@/src/components/modal";
import NewJob from "@/src/components/new-job";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import Jobs from "@/src/components/ui/jobs";
import { fetchData } from "@/src/util/fetchData";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_CYCLE = ["new", "interested", "submitted", "skip"] as const;
type Status = (typeof STATUS_CYCLE)[number];

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
  const [deleteCompanyConfirm, setDeleteCompanyConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Add job sheet
  const [sheet, setSheet] = useState<AddJobSheet | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function deleteCompany() {
    if (!deleteCompanyConfirm) return;
    await fetch(`/api/companies?id=${deleteCompanyConfirm.id}`, { method: "DELETE" });
    setDeleteCompanyConfirm(null);
    loadCompanies(false);
  }

  async function addJob(url: string, title: string, salary: string) {
    if (!sheet) return;
    setSaving(true);
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: sheet.companyId,
        url: url || null,
        title: title || null,
        salary_range: salary || null,
        date_applied: new Date().toISOString().split("T")[0],
        status: "new",
      }),
    });
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
            <div className="flex gap-1">
              <Input
                className=""
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <Button
                onClick={() => {
                  setTierFilter("all");
                  setStatusFilter("all");
                  setSearch("");
                }}
                className={hasActiveFilter ? "text-yellow-400" : ""}
                disabled={!hasActiveFilter}
              >
                <SearchX />
              </Button>

              <Button
                onClick={() => setFilterOpen(true)}
                className={`relative ${hasActiveFilter ? "text-yellow-400" : ""}`}
              >
                <SlidersHorizontal />
              </Button>
            </div>
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
            const newCount = company.jobs.filter(
              (j) => j.status === "new",
            ).length;

            return (
              <Jobs
                loading={loading}
                key={company.id}
                company={company}
                toggleExpand={toggleExpand}
                isExpanded={isExpanded}
                newCount={newCount}
                openSheet={openSheet}
                cycleJobStatus={cycleJobStatus}
                setDeleteConfirm={setDeleteConfirm}
                setDeleteCompanyConfirm={setDeleteCompanyConfirm}
              />
            );
          })}
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <Modal
          title="Delete Job?"
          action={() => setDeleteConfirm(null)}
          footerActions={
            <>
              <Button
                onClick={deleteJob}
                className="flex-1 bg-red-600 text-white"
              >
                Delete
              </Button>

              <Button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-800 text-slate-300"
              >
                Cancel
              </Button>
            </>
          }
        >
          <p className="text-red-500">
            {" "}
            you sure you want to delete {deleteConfirm.title}?
          </p>
        </Modal>
      )}

      {/* Delete company confirm modal */}
      {deleteCompanyConfirm && (
        <Modal
          title="Delete Company?"
          action={() => setDeleteCompanyConfirm(null)}
          footerActions={
            <>
              <Button
                onClick={deleteCompany}
                className="flex-1 bg-red-600 text-white"
              >
                Delete
              </Button>

              <Button
                onClick={() => setDeleteCompanyConfirm(null)}
                className="flex-1 bg-slate-800 text-slate-300"
              >
                Cancel
              </Button>
            </>
          }
        >
          <p className="text-red-500">
            you sure you want to delete {deleteCompanyConfirm.name}? this will also delete all its jobs.
          </p>
        </Modal>
      )}

      {/* Filter sheet */}
      {filterOpen && (
        <Modal
          title="Filters"
          modalType="bottom"
          action={() => setFilterOpen(false)}
          footerActions={
            <Button
              onClick={() => setFilterOpen(false)}
              className="bg-slate-800 text-slate-300"
            >
              Done
            </Button>
          }
        >
          <div className="flex items-center justify-between mb-5">
            {hasActiveFilter && (
              <Button
                className="text-xs text-[#475569] font-mono"
                onClick={() => {
                  setTierFilter("all");
                  setStatusFilter("all");
                  setSearch("");
                }}
              >
                clear all
              </Button>
            )}
          </div>

          <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">
            Tier
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {(["all", 1, 2, 3, 4, 5] as const).map((t) => (
              <Button
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
              </Button>
            ))}
          </div>

          <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">
            Status
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {(["all", "new", "interested", "submitted", "skip"] as const).map(
              (s) => (
                <Button
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
                </Button>
              ),
            )}
          </div>
        </Modal>
      )}

      {/* Add job sheet */}
      {sheet && (
        <NewJob
          closeSheet={closeSheet}
          sheet={sheet}
          saving={saving}
          addJob={addJob}
        />
      )}
    </>
  );
}
