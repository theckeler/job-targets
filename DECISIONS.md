# DECISIONS.md — Why We Did What We Did

A running log of architectural and design decisions. Read this before changing anything structural.

---

## Stack Decisions

**Next.js App Router over Pages Router**
App Router is the current standard. API routes and UI in the same framework, no separate backend needed for a personal tool this size.

**Neon (Postgres) over Supabase, PlanetScale, or SQLite**
Neon integrates directly with Vercel via the marketplace — one click to provision, env vars auto-injected. `@vercel/postgres` client works out of the box. Free tier is sufficient. Supabase adds unnecessary complexity for a single-user app.

**`@vercel/postgres` over raw `pg` or Prisma**
Simplest client for Vercel-hosted Postgres. Tagged template literals prevent SQL injection. No ORM overhead needed for this schema size. If schema grows significantly, migrate to Prisma then.

**shadcn/ui over Radix, Headless UI, or Tremor**
Already used in portfolio-v2. Tailwind-based. Copies components into the project (no black box dependency). Easy to override styles.

**Cookie auth over Vercel Password Protection or NextAuth**
Vercel Password Protection is a paid feature. NextAuth is overkill for a single-user private tool. A simple httpOnly cookie checked in middleware is the right tool — essentially `.htaccess` but for Next.js.

**Standalone app over portfolio-v2 integration**
Keeps deployments independent. No risk of job tracker changes breaking the portfolio. Separate Vercel project, separate domain/URL.

---

## UI Decisions

**Expandable cards over always-visible jobs**
180 companies in the list. Showing all jobs inline would make the list unusable. Expand on tap to see jobs for a company.

**Status as a cycle button over a dropdown**
One tap to advance status: new → interested → submitted → skip → new. Faster on mobile, no extra UI. The status badge is the control.

**Tier filter as pills (planned) over dropdowns (current)**
The original HTML prototype used pill buttons. They're faster to tap on mobile and visually cleaner. The current shadcn Select dropdowns are a temporary state — will be replaced with pills.

**Careers link always visible**
The whole point of this app on mobile is to browse companies and open the careers page. Keep the link button visible (and use in-app navigation only) to avoid Safari handoff.

**3-dot menu over always-visible destructive icons**
On iPhone, space is limited. Put Edit/Delete under a `...` menu to reduce visual noise and prevent accidental deletes.

**"Resume where I left off"**
Track the last touched company and scroll to it on load (when no filters are active). This makes the app usable as a nightly browse session without having to remember where you stopped.

---

## Schema Decisions

**`status` as VARCHAR not ENUM**
Easier to add new statuses without a migration. Values are: `new`, `interested`, `submitted`, `skip`.

**`match_quality` as VARCHAR not normalized**
Values come from job-log.json and are descriptive strings (EXCELLENT, GOOD, BORDERLINE, etc.). Not worth normalizing for this use case.

**Jobs CASCADE on company delete**
If a company is removed, its jobs go with it. No orphaned rows.

**`sort_order` column on companies**
Allows manual ordering within a tier without renumbering IDs. Seeded companies have sort_order 1–180 in the order they were originally curated.

---

## Workflow Decisions

**DB as handoff point between phone and desktop AI**
The phone adds job URLs to the DB with status `new`. The desktop AI session reads `status = 'new'` rows, surfaces them for review, and either processes them (apply workflow) or marks them skip. The DB is the single source of truth — not a file, not a session.

**seed.sql as the canonical company list**
The 180 target companies live in seed.sql. If you need to add companies in bulk, add to seed.sql and re-run. One-off additions go through the app UI or Claude direct DB write.

---

**`pg` global install over project-local for Claude DB access**
Claude's Desktop Commander runs node commands outside the project's module resolution. Global install at `/usr/local/lib/node_modules` with `NODE_PATH` set is the reliable workaround. The project itself uses `@vercel/postgres` as normal — this is only for direct Claude access.

**`POSTGRES_URL_NON_POOLING` for Claude sessions**
The pooled URL (`POSTGRES_URL`) is managed by pgbouncer and expects short-lived app server connections. Direct Claude sessions use the non-pooling URL to avoid connection conflicts.

---

## Things We Explicitly Decided NOT To Do

- No mobile native app — PWA is sufficient for the use case
- No user accounts — single user, cookie auth is enough
- No real-time sync — manual refresh is fine for a personal tool
- No pagination — 180 companies is manageable with filtering/search
- No dark mode — unnecessary complexity for now

---

## PWA / Mobile Decisions

**`window.location.assign(...)` over `window.open(..., "_blank")` for all links**
When the app is installed as a PWA (Add to Home Screen), `_blank` links hand off to Safari — every tap opens a new Safari tab and the user loses their place. Using `window.location.assign(...)` keeps navigation inside the app's standalone webview. The back gesture returns to the tracker. This applies to both careers page links and job URL links.

**PWA share target (best effort)**
Declare a `share_target` in the manifest to accept shared URLs directly into `/share`. iOS support varies depending on how the share is initiated (Share Sheet vs Shortcuts).

---

## URL Scraping Decision

**Server-side fetch in `/api/scrape` over client-side fetch**
Client-side requests to external URLs (job boards, company sites) fail with CORS errors because those sites don't allow arbitrary cross-origin requests. Running the fetch from a Next.js API route runs it on the server, which has no CORS restrictions. Simple regex extraction of `og:title`, `og:site_name`, `<h1>`, and `<title>` is sufficient — no headless browser needed. 8-second timeout with silent failure keeps the UX smooth.

**Auto-fill only if field is empty**
The scrape result fills title/company only if the user hasn't already typed something. Prevents overwriting intentional manual input.
