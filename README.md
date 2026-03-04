# Job Tracker

Private job application tracker. Browse target companies, log job URLs from your phone, review and process them on desktop with AI.

**Live:** (add Vercel URL here once deployed)  
**Access:** Password protected — set `TRACKER_PASSWORD` in env

---

## What It Does

- 180 pre-seeded target companies organized by tier (Dream → Brand)
- Log job postings as you find them — title, URL, salary range
- Status tracking: new → interested → submitted → skip
- Search and filter by tier or status
- Mobile-friendly for browsing at night, desktop-ready for AI-assisted review

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
