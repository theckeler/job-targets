"use client";

import type { CompanyWithJobs, Job } from "@/lib/db";
import { cn } from "@/src/lib/utils";
import {
  BellIcon,
  ChevronDown,
  ChevronRight,
  Link2,
  Trash,
} from "lucide-react";
import { Button } from "./button";

const STATUS_CYCLE = ["new", "interested", "submitted", "skip"] as const;
type Status = (typeof STATUS_CYCLE)[number];

const STATUS_STYLES: Record<Status, string> = {
  new: "text-purple-400",
  interested: "text-yellow-400",
  submitted: "text-emerald-400",
  skip: "text-red-400",
};

const TIER_DOT: Record<number, string> = {
  1: "text-blue-500",
  2: "text-emerald-500",
  3: "text-amber-500",
  4: "text-orange-500",
  5: "text-slate-400",
};

type JobsProps = {
  loading: boolean;
  company: CompanyWithJobs;
  isExpanded: boolean;
  toggleExpand: (id: number) => void;
  newCount: number;
  openSheet: (company: CompanyWithJobs) => void;
  cycleJobStatus: (job: Job) => void;
  setDeleteConfirm: (confirm: { id: number; title: string } | null) => void;
  setDeleteCompanyConfirm: (confirm: { id: number; name: string } | null) => void;
};

export default function Jobs({
  loading,
  company,
  isExpanded,
  toggleExpand,
  newCount,
  cycleJobStatus,
  setDeleteConfirm,
  setDeleteCompanyConfirm,
}: JobsProps) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">loading...</p>
      </div>
    );
  }

  return (
    <div key={company.id} className="bg-slate-900 rounded">
      {/* Company row */}
      <div
        className="flex flex-auto justify-between items-center gap-2 px-2 py-3 cursor-pointer"
        onClick={() => toggleExpand(company.id)}
      >
        <Button
          className={cn(`${TIER_DOT[company.tier]}`, "px-0 min-w-8")}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(company.id);
          }}
        >
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </Button>
        <div className="flex-auto font-semibold text-white truncate leading-tight">
          {company.name}
        </div>

        <div className="flex flex-none gap-2">
          {newCount > 0 && (
            <Button className="relative bg-purple-400 px-2">
              <BellIcon />
              <span className="absolute right-1 top-1 rounded-full w-5 h-5 bg-black text-white flex items-center justify-center text-xs">
                {newCount}
              </span>
            </Button>
          )}

          {company.careers_url && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = company.careers_url!;
              }}
              className="text-yellow-500"
            >
              <Link2 />
            </Button>
          )}

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteCompanyConfirm({ id: company.id, name: company.name });
            }}
            className="text-red-500"
          >
            <Trash />
          </Button>

          {/* <Button
            className="text-green-300 "
            onClick={(e) => {
              e.stopPropagation();
              openSheet(company);
            }}
          >
            <LayersPlus />
          </Button> */}
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
            <div className="divide-y divide-slate-500">
              {company.jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-2 flex justify-between items-center gap-1"
                >
                  {job.url ? (
                    <a
                      href={job.url}
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

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => cycleJobStatus(job)}
                      className={cn(
                        "",
                        STATUS_STYLES[job.status as Status] ??
                          STATUS_STYLES.new,
                      )}
                    >
                      {job.status}
                    </Button>

                    <Button
                      onClick={() =>
                        setDeleteConfirm({
                          id: job.id,
                          title: job.title || job.url || "this job",
                        })
                      }
                      className="text-red-500"
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
