# Case Study: Job Tracker (PWA + Postgres)

## Problem

Job searching is fragmented:
- Discovery happens on mobile (late at night, commuting, between meetings)
- Deep review and application decisions happen on desktop
- Bookmarks, notes, and “where did I leave off” fall apart across sessions

The goal was a private tool that makes capture fast on iPhone and makes the next-day desktop review loop deterministic.

## Constraints

- Single-user, private app: no OAuth, no multi-tenant complexity
- Must work well as an installed iPhone PWA (no Safari handoff)
- Job boards vary wildly:
- Some block server-side fetch
- Some require JavaScript to render the description
- URL/title scraping should be best-effort, never block capture

## Solution

A password-protected Next.js App Router app backed by Neon Postgres.

- Mobile capture:
- Browse companies, open careers pages inside the PWA webview
- Share or paste a job URL into `/share`, select company, save as `status='new'`
- “Resume where I left off”: last touched company is highlighted and auto-scrolled to on load (when no filters are active)

- Desktop review:
- Pull all `status='new'` jobs from Postgres
- Evaluate each job, decide apply/skip, and update status

## Architecture

- Frontend: Next.js 16 + React + TypeScript
- DB: Neon Postgres (`@vercel/postgres`)
- Auth: httpOnly cookie checked in middleware
- Scraping: server-side `/api/scrape` that prefers JSON-LD `JobPosting` and falls back to meta tags

## What’s Next

- Edit job details (title, salary, notes)
- Better share-first capture (optional: one-tap save with minimal UI)
- Stronger scraping heuristics per job board, while keeping the “never block capture” rule

