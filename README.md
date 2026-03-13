# Job Tracker

Private job application tracker. Browse target companies, log job URLs from your phone, review and process them on desktop with AI.

**Live:** https://job-targets.vercel.app  
**Access:** Password protected — set `TRACKER_PASSWORD` in env

**Case study:** `CASE_STUDY.md`

---

## What It Does

- 228 pre-seeded target companies organized by tier (Dream → Brand)
- Log job postings as you find them — paste a URL and title auto-fills from the page
- Add new companies on the fly — paste a URL and company name auto-fills
- Delete companies or jobs with a confirm prompt
- Status tracking: new → interested → submitted → skip
- Search and filter by tier or status
- Installed as a PWA — stays in the app's browser, no Safari handoff
- Mobile-friendly for browsing at night, desktop-ready for AI-assisted review

---

## Mobile Capture Flow (iPhone)

1. Install the PWA: Safari → Share → "Add to Home Screen"
2. Browse company career sites inside the PWA
3. When you find a job:
   - Share the job URL to the tracker (best effort via share target), or copy link and paste into `/share`
4. Select company, hit Save → job is created as `status='new'`
5. Keep browsing, then close the in-app browser tab and return to the tracker

---

## Quick Start (Local)

```bash
# 1. Install deps
npm install

# 2. Set up env
cp .env.example .env.local
# Fill in POSTGRES_*, TRACKER_PASSWORD, AUTH_SECRET

# Generate AUTH_SECRET:
openssl rand -hex 32

# 3. Seed the database
# Go to Neon console → SQL Editor → paste contents of seed.sql → Run

# 4. Run
npm run dev
# → http://localhost:3000 (redirects to /tracker)
```

---

## Deployment (Vercel)

```bash
git add . && git commit -m "your message"
git push
# Vercel auto-deploys on push to main
```

Make sure these env vars are set in Vercel dashboard:
- `POSTGRES_*` — auto-injected by Neon integration
- `TRACKER_PASSWORD` — your login password
- `AUTH_SECRET` — same value as local (run `openssl rand -hex 32`)

---

## Docs

| File | What's In It |
|---|---|
| `ARCH.md` | Stack, folder structure, DB schema, data flow |
| `DECISIONS.md` | Why we chose each technology and pattern |
| `PATTERNS.md` | How to write code in this codebase |
| `STATUS.md` | What's working, what's broken, what's next |
| `SETUP.md` | Step-by-step first-time setup |
| `seed.sql` | DB schema + all seed data |

---

## AI Workflow (Desktop)

Start a Claude session and say:

> "Read ARCH.md, DECISIONS.md, PATTERNS.md, and STATUS.md. Then connect to the DB and pull all jobs with status = 'new'."

Claude will surface new job URLs added from your phone. Paste job descriptions and Claude will output apply/skip recommendations and next steps.
