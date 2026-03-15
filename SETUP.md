# Job Tracker Setup

## 1. Create the Next.js project IN this directory

```bash
cd /Users/toddheckeler/websites/job-search/job-targets
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
```

> Note: Running in `.` scaffolds into the current directory. It'll ask about existing files — say **yes** to overwrite (or **no** to keep the ones already here).

## 2. Install shadcn/ui

```bash
npx shadcn@latest init
# Style: Default | Base color: Slate | CSS variables: Yes
```

## 3. Add shadcn components

```bash
npx shadcn@latest add button input badge table dialog select
```

## 4. Install Vercel Postgres

```bash
npm install @vercel/postgres
```

## 5. Set up environment variables

```bash
cp .env.example .env.local
# Fill in the values
```

Generate AUTH_SECRET:
```bash
openssl rand -hex 32
```

Optional (for iOS Shortcut capture via `/api/shortcuts/jobs`):
- Set `SHORTCUTS_TOKEN` to a long random string (store in Vercel + local `.env.local`)

## 6. Set up Vercel Postgres

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Storage → Create Database → Postgres (Neon)
4. Copy env vars into Vercel project settings
5. Run `seed.sql` in the Vercel Postgres query console

## 7. Run locally

```bash
npm run dev
```

Visit http://localhost:3000 → redirects to `/tracker` → asks for password.

## 8. Deploy

```bash
git add . && git commit -m "init job tracker"
git push
```

Vercel auto-deploys on push.

---

## What's pre-seeded

- **180 target companies** across 5 tiers (Dream, High, Good, Worth, Brand)
- **~46 real job applications** from job-log.json with correct status, salary ranges, and dates
- The `WITH` clause in seed.sql matches company names to IDs automatically

## Adding new jobs

Hit `+ job` on any company row in the tracker — enter title, URL, and salary range inline. Status defaults to `new` and cycles through: `new → interested → submitted → skip`.
