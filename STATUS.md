# STATUS.md — Current State

_Updated: 2026-03-04_

---

## What's Working

- Next.js app scaffolded and building
- Neon DB provisioned, env vars in `.env.local`
- `tsconfig.json` `@/` alias fixed (was pointing to `./src/*`, now `"./*"`)
- Auth middleware in place — cookie-based, 30-day session
- All API routes written: GET/POST companies, POST/PATCH/DELETE jobs, POST login
- Tracker UI renders — expandable cards, status cycling, add job inline, delete job
- `seed.sql` written with schema + 180 companies + ~46 real applications

## What's NOT Confirmed Yet

- **DB not confirmed seeded** — seed.sql needs to be run in Neon console
- **App not confirmed running on phone** — needs to be verified on mobile browser
- **Vercel deployment status unknown** — `TRACKER_PASSWORD` and `AUTH_SECRET` may not be in Vercel dashboard env vars yet

## Known Issues / Bugs

- **Filter controls are dropdowns** — should be pill buttons like the HTML prototype for better mobile UX
- **UI doesn't match HTML prototype** — Outfit/DM Mono fonts, color scheme, and layout from orig-html/job-targets.html not yet applied to the React app

## Confirmed This Session

- DB connected and seeded: 180 companies, 26 jobs live in Neon
- Claude can read/write DB directly via Desktop Commander using `NODE_PATH=/usr/local/lib/node_modules node`
- `pg` installed globally at `/usr/local/lib/node_modules`
- Use `POSTGRES_URL_NON_POOLING` for all Claude direct DB access

## Fixed This Session

- Careers link now visible on mobile (removed `hidden sm:block`)
- Removed debug `console.log({ companies })` from tracker/page.tsx

## Next Up (Session 2)

1. Confirm DB is seeded — run seed.sql in Neon console if not done
2. Verify app running locally and on phone
3. Restyle to match HTML prototype (Outfit/DM Mono fonts, colors, pill filters)

## Backlog (Future Sessions)

- Swipe-to-reveal actions on mobile
- PWA manifest + home screen install
- Share Target (pipe URLs from Safari into app)
- AI desktop workflow — Claude reads `status='new'` jobs from DB, presents for review
- Apply process workflow (to be defined)
- Add/remove companies from UI
- Inline tag editing
- README.md
