import Link from "next/link";

const ICLOUD_SHORTCUT_URL =
  "https://www.icloud.com/shortcuts/641dd90f278f4689b81868d9f7d9b7c1";

export default function ShortcutPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#e2e8f0]">
      <div className="mx-auto max-w-2xl p-4 pt-10">
        <h1 className="text-xl font-semibold tracking-tight">iOS Shortcut</h1>
        <p className="mt-2 text-sm text-[#94a3b8]">
          iOS won&apos;t silently install shortcuts. This link opens Shortcuts and
          asks you to add/import.
        </p>

        <div className="mt-6 rounded-2xl border border-[#1e293b] bg-[#0b1225] p-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#94a3b8]">
            Install (Legacy)
          </h2>
          <p className="mt-2 text-sm text-[#cbd5e1]">
            This shortcut opens the tracker&apos;s <code>/share</code> page with the
            URL prefilled. Depending on iOS, it may open Safari instead of staying
            inside the PWA.
          </p>
          <Link
            href={ICLOUD_SHORTCUT_URL}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-medium text-white"
          >
            Open iCloud Shortcut Link
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-[#1e293b] bg-[#0b1225] p-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#94a3b8]">
            Recommended (No Browser Switching)
          </h2>
          <p className="mt-2 text-sm text-[#cbd5e1]">
            Use Shortcuts&apos; <strong>Get Contents of URL</strong> to POST directly
            into the DB:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-[#020617] p-3 text-xs text-[#cbd5e1]">
            {`POST https://job-targets.vercel.app/api/shortcuts/jobs
Authorization: Bearer <SHORTCUTS_TOKEN>
Content-Type: application/json

{ "url": "https://..." }`}
          </pre>
          <p className="mt-3 text-sm text-[#94a3b8]">
            If you want, I can help you create a v2 shortcut and then you share its
            new iCloud link so we can replace the legacy link above.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/tracker"
            className="text-sm text-sky-400 underline underline-offset-4"
          >
            Back to tracker
          </Link>
        </div>
      </div>
    </div>
  );
}

