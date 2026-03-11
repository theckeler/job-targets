# STATUS.md — Current State

_Updated: 2026-03-10_

---

## What's Working

**Core app**
- Next.js app deployed on Vercel, auto-deploys on push to main
- Neon DB live — 228 companies, 122 jobs migrated from job-log.json
- Auth middleware in place — cookie-based, 30-day session
- All API routes: GET/POST/DELETE companies, POST/PATCH/DELETE jobs, POST login, GET scrape

**Tracker UI**
- Expandable company cards with job lists
- Status cycling (new → interested → submitted → skip) via tap
- Add job bottom sheet — auto-fills title by scraping pasted URL on blur
- Add company bottom sheet — auto-fills company name by scraping pasted URL on blur, tier picker
- Delete job with yes/no confirm modal
- Delete company with yes/no confirm modal (cascades — removes all its jobs too)
- Search by company name or tag
- Filter by tier and status — pill buttons
- Bell badge on companies with `new` jobs

**PWA / Mobile**
- Installed as home screen app on iPhone
- All links stay inside the PWA webview — no Safari handoff
- `window.location.href` used throughout (no `target="_blank"`)

**Scraping**
- `/api/scrape` server-side endpoint — no CORS issues
- Pulls `og:title`, `og:site_name`, `<h1>`, `<title>` tags
- Strips " | Company" / " - Company" suffixes from job titles
- Fails silently if site blocks or times out

---

## DB State

- 228 companies across 5 tiers
- 122 jobs: 54 submitted, 4 interested, 64 new
- All jobs have `location`, `target_salary`, `key_highlights` columns populated where available
- Full migration from job-log.json complete

---

## Known Limitations

- Scraping doesn't work on sites that require JavaScript to render (e.g. some Workday postings) — title field stays blank, fill manually
- Some job boards (LinkedIn, Glassdoor) block server-side fetch — scrape returns empty, fill manually
- No bulk import UI — large additions still done via SQL or Claude direct DB write

---

## Backlog

- Swipe-to-reveal actions on mobile (delete/status without expanding)
- Inline tag editing on company rows
- Edit existing job details (title, salary, notes)
- Add new company from /share page (type name with no match → "Add as new company")
- AI desktop workflow — Claude reads `status='new'` jobs, presents for review
