"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useEffect, useRef, useState } from "react";
import Modal from "./modal";

type AddJobSheet = {
  companyName: string;
};

export default function JobSheet({
  closeSheet,
  sheet,
  saving,
  addJob,
}: {
  closeSheet: () => void;
  sheet: AddJobSheet | null;
  saving: boolean;
  addJob: (url: string, title: string, salary: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [salary, setSalary] = useState("");
  const [scraping, setScraping] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheet) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    } else {
      setUrl("");
      setTitle("");
      setSalary("");
      setScraping(false);
    }
  }, [sheet]);

  if (!sheet) return null;

  async function scrapeUrl(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || !trimmed.startsWith("http")) return;
    setScraping(true);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.jobTitle && !title) setTitle(data.jobTitle);
    } catch {
      // silent fail — fields stay blank, user fills manually
    } finally {
      setScraping(false);
    }
  }

  function handleSave() {
    if (!url && !title) return;
    addJob(url, title, salary);
  }

  return (
    <Modal
      title={`Add job at ${sheet.companyName}`}
      action={closeSheet}
      modalType="bottom"
      footerActions={
        <>
          <Button
            className="bg-green-700 text-white flex-1"
            onClick={handleSave}
            disabled={saving || scraping || (!url && !title)}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button className="bg-gray-700 text-white flex-1" onClick={closeSheet}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          ref={urlInputRef}
          placeholder="Job URL (paste here)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={(e) => scrapeUrl(e.target.value)}
        />
        <Input
          placeholder={scraping ? "Fetching title..." : "Title (optional)"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={scraping}
        />
        <Input
          placeholder="Salary range (optional)"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
      </div>
    </Modal>
  );
}
