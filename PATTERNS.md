# PATTERNS.md — How Things Are Done Here

Read this before writing new code. Consistency matters more than cleverness.

---

## API Routes

All routes live in `app/api/`. One file per resource.

**Structure:**
```ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM table`
    return NextResponse.json(rows)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
```

**Rules:**
- Always wrap in try/catch
- Always return `{ error: '...' }` with appropriate status on failure
- Use tagged template literals for all SQL — never string concatenation
- DELETE uses query params: `DELETE /api/jobs?id=123`, `DELETE /api/companies?id=123`
- PATCH uses request body JSON
- Company DELETE cascades — deletes all jobs for that company first, then the company

---

## Database Queries

Use `sql` from `@/lib/db` — it's re-exported from `@vercel/postgres`.

```ts
// Good
const { rows } = await sql`SELECT * FROM companies WHERE id = ${id}`

// Never do this
const { rows } = await sql.query(`SELECT * FROM companies WHERE id = ${id}`)
```

COALESCE pattern for partial updates (only update provided fields):
```ts
await sql`
  UPDATE jobs SET
    status = COALESCE(${status}, status),
    title  = COALESCE(${title},  title),
    updated_at = NOW()
  WHERE id = ${id}
`
```

---

## TypeScript Types

All DB types live in `lib/db.ts`. Add new types there, not inline.

```ts
export type Company = { ... }
export type Job = { ... }
export type CompanyWithJobs = Company & { jobs: Job[] }
```

---

## Client Components

`app/tracker/page.tsx` is a client component (`'use client'`). It:
- Fetches data with `useCallback` + `useEffect`
- Uses a single `fetchData()` function that refreshes after any mutation
- Keeps all state local — no global state manager needed at this scale

Pattern for mutations:
```ts
async function doSomething() {
  await fetch('/api/jobs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  })
  fetchData() // always refresh after mutation
}
```

---

## Import Alias

`@/` maps to the project root (not `src/`). This was explicitly fixed in `tsconfig.json`.

```ts
import { sql } from '@/lib/db'           // ✓ correct
import { Button } from '@/src/components/ui/button'  // ✓ also works (shadcn path)
```

---

## Env Vars

- Never hardcode credentials
- `.env.local` for local dev — never committed
- Vercel dashboard for production
- `POSTGRES_*` vars auto-injected by Neon integration
- `TRACKER_PASSWORD` and `AUTH_SECRET` manually added

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `job-targets.html` |
| Components | PascalCase | `TrackerPage` |
| Functions | camelCase | `fetchData`, `cycleJobStatus` |
| DB columns | snake_case | `company_id`, `date_applied` |
| CSS classes | Tailwind utilities only | no custom class names |
| Status values | lowercase string | `'new'`, `'submitted'` |
| Tier values | integer 1–5 | `1` = Dream, `5` = Brand |

---

## Claude DB Access Pattern

Always use `NODE_PATH=/usr/local/lib/node_modules` and `POSTGRES_URL_NON_POOLING` from `.env.local`.

```js
// scripts/db.js — reusable helper
const CONN = process.env.POSTGRES_URL_NON_POOLING;
```

Common operations via Desktop Commander:

```bash
# Pull new jobs for AI review
NODE_PATH=/usr/local/lib/node_modules node scripts/db.js new-jobs

# Add a job directly
NODE_PATH=/usr/local/lib/node_modules node scripts/db.js add-job --company="Linear" --title="Staff Engineer" --url="https://..."

# Update a job status
NODE_PATH=/usr/local/lib/node_modules node scripts/db.js update-job --id=5 --status="submitted"
```

Never use the pooled `POSTGRES_URL` for Claude sessions — use `POSTGRES_URL_NON_POOLING` only.

---

## Scrape-on-Blur Pattern

Both add-job and add-company sheets auto-fill fields by scraping a pasted URL on blur. The pattern:

```ts
async function scrapeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.startsWith("http")) return;
  setScraping(true);
  try {
    const res = await fetch(`/api/scrape?url=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    if (data.jobTitle && !title) setTitle(data.jobTitle);  // only if field is empty
  } catch {
    // silent fail — user fills manually
  } finally {
    setScraping(false);
  }
}

// Attach to input:
<Input onBlur={(e) => scrapeUrl(e.target.value)} />
```

Rules:
- Always check `!trimmed.startsWith("http")` before fetching — skip partial URLs
- Only set the field if it's currently empty (`!title`, `!name`) — don't overwrite user input
- Show a placeholder like `"Fetching title..."` and disable the field while `scraping === true`
- Disable Save button while scraping
- Never throw — catch and silently continue

---

## Bottom Sheet Components

Both `new-job.tsx` and `new-company.tsx` use the shared `Modal` component with `modalType="bottom"`. Pattern:

```tsx
<Modal
  title="Add Company"
  action={onClose}          // backdrop click closes
  modalType="bottom"
  footerActions={<>...</>}
>
  {/* form fields */}
</Modal>
```

Reset all fields in the `useEffect` when open/sheet prop goes falsy. Focus the first input with `useRef` + `setTimeout(..., 100)` to let the sheet animate in before keyboard opens.

---

## What Not To Do

- Don't add a global state manager (Redux, Zustand) — local state is enough
- Don't add an ORM — raw SQL with `@vercel/postgres` is fine
- Don't split CSS into separate files — keep styles in Tailwind classes or `globals.css`
- Don't create new API routes for things that can be handled by PATCH with COALESCE
- Don't commit `.env.local`
