"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useEffect, useRef, useState } from "react";
import Modal from "./modal";

const TIER_LABELS: Record<number, string> = {
  1: "Dream",
  2: "High",
  3: "Good",
  4: "Worth",
  5: "Brand",
};

export default function NewCompany({
  open,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    url: string;
    careers_url: string;
    tier: number;
    tag: string;
  }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [careersUrl, setCareersUrl] = useState("");
  const [tier, setTier] = useState<number>(3);
  const [tag, setTag] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 100);
    } else {
      setName("");
      setUrl("");
      setCareersUrl("");
      setTier(3);
      setTag("");
    }
  }, [open]);

  if (!open) return null;

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), url, careers_url: careersUrl, tier, tag });
  }

  return (
    <Modal
      title="Add Company"
      action={onClose}
      modalType="bottom"
      footerActions={
        <>
          <Button
            className="bg-green-700 text-white flex-1"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button className="bg-gray-700 text-white flex-1" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          ref={nameRef}
          placeholder="Company name (required)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Homepage URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          placeholder="Careers page URL (optional)"
          value={careersUrl}
          onChange={(e) => setCareersUrl(e.target.value)}
        />
        <Input
          placeholder="Tag (optional — e.g. devtools, fintech)"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        <div>
          <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-2">
            Tier
          </p>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((t) => (
              <Button
                key={t}
                onClick={() => setTier(t)}
                style={{ minHeight: 44 }}
                className={`flex-1 text-xs font-medium rounded-lg transition-colors ${
                  tier === t
                    ? "bg-[#f1f5f9] text-[#0f172a]"
                    : "bg-[#1e293b] text-[#64748b] active:bg-[#334155]"
                }`}
              >
                {TIER_LABELS[t]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
