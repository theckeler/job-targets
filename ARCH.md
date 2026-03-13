# ARCH.md — Job Tracker Architecture

## What This Is

A private, password-protected Next.js web app for tracking job applications. Primary use case: browse target companies and log job URLs from your phone at night, then pull that data into an AI session on desktop for processing.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR + API routes in one repo |
| Language | TypeScript | Strict mode enabled |
| Database | Neon (Postgres) via Vercel | Serverless, free tier, `@vercel/postgres` client |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first, component library pre-installed |
| Auth | Cookie-based middleware | Simple, no OAuth needed for private personal tool |
| Deployment | Vercel | Auto-deploys on push, env vars managed there |

---

## Folder Structure

```
job-targets/
├── app/
│   ├── api/
│   │   ├── companies/route.ts   # GET all companies+jobs, POST new company, PATCH update, DELETE company+jobs
│   │   ├── jobs/route.ts        # POST add job, PATCH update, DELETE remove
│   │   ├── scrape/route.ts      # GET scrape a URL → returns jobTitle + company + description (best effort)
│   │   └── login/route.ts       # POST sets auth cookie
│   ├── login/page.tsx           # Password gate UI
│   ├── share/page.tsx           # Add job from shared URL (company picker)
│   ├── share-target/route.ts    # PWA share_target POST handler → redirects to /share
│   ├── tracker/page.tsx         # Main tracker UI (client component)
│   ├── globals.css              # Tailwind + shadcn CSS vars
│   ├── layout.tsx               # Root layout, Geist font
│   └── page.tsx                 # Redirect → /tracker
├── lib/
│   └── db.ts                    # @vercel/postgres sql client + TypeScript types
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn components (Button, Input, Badge, Select)
│   │   ├── modal.tsx            # Reusable modal (center or bottom sheet)
│   │   ├── new-job.tsx          # Add job bottom sheet — scrapes title from URL on blur
│   │   └── new-company.tsx      # Add company bottom sheet — scrapes name from URL on blur
│   │   └── edit-company.tsx     # Edit existing company (name, urls, tier, tag)
├── middleware.ts                 # Auth gate — redirects to /login if no valid cookie
├── seed.sql                     # Schema + 180 companies + ~46 real applications
├── .env.local                   # Local env vars (never committed)
└── orig-html/                   # Original HTML prototype (reference only)
```

---

## Database Schema

```sql
companies (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255),
  url          VARCHAR(500),        -- company homepage
  careers_url  VARCHAR(500),        -- direct careers page link
  tier         INTEGER,             -- 1=Dream, 2=High, 3=Good, 4=Worth, 5=Brand
  tag          TEXT,                -- "Why you" description
  sort_order   INTEGER,             -- manual ordering within tier
  created_at   TIMESTAMP
)

jobs (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER → companies(id) CASCADE,
  title         VARCHAR(500),
  url           VARCHAR(1000),      -- direct link to job posting
  status        VARCHAR(50),        -- new | interested | submitted | skip
  notes         TEXT,
  salary_range  VARCHAR(255),
  match_quality VARCHAR(100),       -- EXCELLENT | GOOD | BORDERLINE etc.
  date_applied  DATE,
  location      VARCHAR(255),       -- e.g. "Remote - US"
  target_salary VARCHAR(255),       -- e.g. "$180,000 - $220,000"
  key_highlights TEXT[],            -- array of highlight strings
  created_at    TIMESTAMP,
  updated_at    TIMESTAMP
)
```

---

## Scrape Endpoint

`GET /api/scrape?url=<encoded-url>` — server-side fetch of any URL. Returns:

```json
{
  "jobTitle": "Senior Frontend Engineer",
  "company": "Stripe",
  "description": "Best-effort short description (JSON-LD or meta tags)",
  "hasLdJobPosting": true,
  "ogTitle": "...",
  "pageTitle": "...",
  "h1": "..."
}
```

Runs server-side to avoid CORS. Pulls `og:title`, `og:site_name`, `<h1>`, and `<title>` tags. Strips common suffixes ("Title | Company", "Title - Company") to isolate the job title. 8-second timeout. Fails silently — fields stay blank if scrape fails.

Used by `new-job.tsx` (auto-fills title on URL blur) and `new-company.tsx` (auto-fills company name on URL blur).

---

## Share Target (PWA)

The manifest declares a `share_target` so the iOS/Android Share Sheet can route shared URLs directly into the installed app. The handler lives at `app/share-target/route.ts` and redirects to `app/share/page.tsx` with query params.

---

## Auth Flow

1. Every request hits `middleware.ts`
2. Middleware checks for `tracker-auth` cookie matching `AUTH_SECRET` env var
3. No match → redirect to `/login?from=<original path>`
4. `/api/login` POST validates against `TRACKER_PASSWORD`, sets httpOnly cookie (30 days)
5. Public paths: `/login`, `/api/login`

---

## Data Flow

```
Phone (browser) → /tracker → GET /api/companies → Neon DB
                           ← JSON: companies[] with jobs[] nested

Phone adds job → POST /api/jobs → Neon DB → fetchData() refresh

Desktop AI session → Claude reads DB directly via psycopg2/connection string
                   → pulls status='new' jobs → presents for review
```

---

## Env Vars Required

```
POSTGRES_URL               # Neon pooled connection (used by @vercel/postgres)
POSTGRES_URL_NON_POOLING   # Neon direct connection
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
POSTGRES_PRISMA_URL        # Connection with pgbouncer settings
TRACKER_PASSWORD           # Login password for the app
AUTH_SECRET                # Random 32-byte hex string for cookie signing
```

---

## Claude Direct DB Access

Claude can connect to Neon directly via Desktop Commander using the `pg` package installed globally at `/usr/local/lib/node_modules`.

```bash
NODE_PATH=/usr/local/lib/node_modules node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING });
...
"
```

Use `POSTGRES_URL_NON_POOLING` (direct connection) not `POSTGRES_URL` (pooled) for Claude sessions — pooled connections are for the app server.

A reusable script lives at `scripts/db.js` for common operations. See PATTERNS.md for usage.

---

## Deployment

- Repo: `job-search` monorepo, this app lives at `/job-targets`
- Vercel project root: `/job-targets`
- Auto-deploys on push to main
- Env vars duplicated in Vercel dashboard (Storage → Neon auto-injects POSTGRES_*)
- `TRACKER_PASSWORD` and `AUTH_SECRET` must be manually added in Vercel dashboard
