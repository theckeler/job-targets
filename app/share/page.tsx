"use client";

import type { CompanyWithJobs } from "@/lib/db";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type MatchedCompany = { id: number; name: string; tier: number };

const TIER_LABELS: Record<number, string> = {
  1: "Dream",
  2: "High",
  3: "Good",
  4: "Worth",
  5: "Brand",
};

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function ShareForm() {
  const router = useRouter();
  const params = useSearchParams();
  const incomingUrl = params.get("url") || "";

  const [companies, setCompanies] = useState<MatchedCompany[]>([]);
  const [matched, setMatched] = useState<MatchedCompany | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [jobUrl, setJobUrl] = useState(incomingUrl);
  const [title, setTitle] = useState("");
  const [salary, setSalary] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    const data: CompanyWithJobs[] = await res.json();
    const slim = data.map((c) => ({ id: c.id, name: c.name, tier: c.tier }));
    setCompanies(slim);

    if (incomingUrl) {
      const incoming = extractDomain(incomingUrl);
      const match = data.find((c) => {
        if (!c.url) return false;
        return extractDomain(c.url) === incoming || c.url.includes(incoming);
      });
      if (match) {
        setMatched({ id: match.id, name: match.name, tier: match.tier });
        setSelectedId(match.id);
        setCompanySearch(match.name);
      }
    }
  }, [incomingUrl]);

  useEffect(() => {
    (async () => {
      await fetchCompanies();
    })();
  }, [fetchCompanies]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()),
  );

  async function handleSave() {
    if (!selectedId) {
      setError("Pick a company first.");
      return;
    }
    if (!jobUrl && !title) {
      setError("Need at least a URL or title.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: selectedId,
        url: jobUrl || null,
        title: title || null,
        salary_range: salary || null,
        date_applied: new Date().toISOString().split("T")[0],
        status: "new",
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => router.push("/tracker"), 1200);
    } else {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl">✓</div>
          <p className="text-slate-700 font-medium">Saved</p>
          <p className="text-slate-400 text-sm">Going to tracker...</p>
        </div>
      </div>
    );
  }

  const selectedCompany = companies.find((c) => c.id === selectedId);

  return (
    <div
      className="min-h-screen flex items-start justify-center pt-10 px-4"
      style={{ backgroundColor: "#0a0f1e" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }}
      >
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid #1e293b" }}
        >
          <h1 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>
            Log a Job
          </h1>
          {matched && (
            <p className="text-xs mt-0.5" style={{ color: "#10b981" }}>
              Matched to {matched.name}
            </p>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5" ref={dropdownRef}>
            <label
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "#475569" }}
            >
              Company
            </label>
            <div className="relative">
              <Input
                className="h-11 text-sm"
                style={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  color: "#f1f5f9",
                }}
                placeholder="Search companies..."
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) {
                    setSelectedId(null);
                    setMatched(null);
                  }
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {selectedCompany && (
                <p className="text-xs mt-1" style={{ color: "#475569" }}>
                  {selectedCompany.name} · {TIER_LABELS[selectedCompany.tier]}
                </p>
              )}
              {showDropdown &&
                companySearch &&
                filteredCompanies.length > 0 && (
                  <div
                    className="absolute z-10 top-full mt-1 w-full rounded-xl shadow-xl max-h-48 overflow-y-auto"
                    style={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                    }}
                  >
                    {filteredCompanies.slice(0, 8).map((c) => (
                      <Button
                        key={c.id}
                        className="w-full text-left px-3 py-3 text-sm flex items-center justify-between"
                        style={{ color: "#cbd5e1" }}
                        onClick={() => {
                          setSelectedId(c.id);
                          setCompanySearch(c.name);
                          setShowDropdown(false);
                          setError("");
                        }}
                      >
                        <span>{c.name}</span>
                        <span className="text-xs" style={{ color: "#475569" }}>
                          {TIER_LABELS[c.tier]}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "#475569" }}
            >
              Job URL
            </label>
            <Input
              className="h-11 text-sm"
              style={{
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                color: "#f1f5f9",
              }}
              placeholder="https://..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "#475569" }}
            >
              Title{" "}
              <span
                className="normal-case font-normal"
                style={{ color: "#334155" }}
              >
                (optional)
              </span>
            </label>
            <Input
              className="h-11 text-sm"
              style={{
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                color: "#f1f5f9",
              }}
              placeholder="Senior Frontend Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "#475569" }}
            >
              Salary{" "}
              <span
                className="normal-case font-normal"
                style={{ color: "#334155" }}
              >
                (optional)
              </span>
            </label>
            <Input
              className="h-11 text-sm"
              style={{
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                color: "#f1f5f9",
              }}
              placeholder="$160K - $220K"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 h-11 font-medium"
              style={{ backgroundColor: "#f1f5f9", color: "#0f172a" }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Job"}
            </Button>
            <Button
              className="h-11 px-4"
              style={{ color: "#475569" }}
              onClick={() => router.push("/tracker")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense>
      <ShareForm />
    </Suspense>
  );
}
