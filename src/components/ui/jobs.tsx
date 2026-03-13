"use client";

import type { CompanyWithJobs, Job } from "@/lib/db";
import { cn } from "@/src/lib/utils";
import {
  BellIcon,
  ChevronDown,
  ChevronRight,
  Link2,
  MoreVertical,
  Trash,
} from "lucide-react";
import { useEffect, useState } from "react";
import Modal from "@/src/components/modal";
import { Button } from "./button";

type Status = "new" | "interested" | "submitted" | "skip";

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
  cycleJobStatus: (job: Job) => void;
  setDeleteConfirm: (confirm: { id: number; title: string } | null) => void;
  setDeleteCompanyConfirm: (confirm: { id: number; name: string } | null) => void;
  onEditCompany: (company: CompanyWithJobs) => void;
  isLastActive: boolean;
  touchCompany: (id: number) => void;
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
  onEditCompany,
  isLastActive,
  touchCompany,
}: JobsProps) {
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    if (!actionsOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActionsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actionsOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">loading...</p>
      </div>
    );
  }

  function openCareers(url: string) {
    touchCompany(company.id);
    window.location.assign(url);
  }

  function openJobUrl(url: string) {
    touchCompany(company.id);
    window.location.assign(url);
  }

  const careersLabel = (() => {
    const u = company.careers_url || company.url || "";
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return (
    <div
      key={company.id}
      className={cn(
        "bg-slate-900 rounded",
        isLastActive ? "ring-1 ring-sky-500/70" : "",
      )}
      data-company-id={company.id}
    >
      {/* Company row */}
      <div
        className="flex flex-auto justify-between items-center gap-2 px-2 py-3 cursor-pointer"
        onClick={() => {
          touchCompany(company.id);
          toggleExpand(company.id);
        }}
      >
        <Button
          className={cn(`${TIER_DOT[company.tier]}`, "px-0 min-w-8")}
          onClick={(e) => {
            e.stopPropagation();
            touchCompany(company.id);
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

          {(company.careers_url || company.url) && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                openCareers((company.careers_url || company.url) as string);
              }}
              className="text-yellow-500"
            >
              <span className="inline-flex items-center gap-2">
                <Link2 />
                <span className="hidden sm:inline text-xs font-mono text-yellow-500/90">
                  {careersLabel || "link"}
                </span>
              </span>
            </Button>
          )}

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setActionsOpen(true);
            }}
            className="text-slate-300"
          >
            <MoreVertical />
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

      {actionsOpen && (
        <Modal
          title={company.name}
          modalType="bottom"
          action={() => setActionsOpen(false)}
          footerActions={
            <Button
              onClick={() => setActionsOpen(false)}
              className="bg-slate-800 text-slate-300"
            >
              Done
            </Button>
          }
        >
          <div className="space-y-2">
            <Button
              className="w-full bg-[#1e293b] text-slate-200"
              onClick={() => {
                setActionsOpen(false);
                onEditCompany(company);
              }}
            >
              Edit
            </Button>
            <Button
              className="w-full bg-red-700 text-white"
              onClick={() => {
                setActionsOpen(false);
                setDeleteCompanyConfirm({ id: company.id, name: company.name });
              }}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}

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
                    <Button
                      className="text-sm text-white block truncate font-medium px-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openJobUrl(job.url);
                      }}
                    >
                      {job.title || job.url}
                    </Button>
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
