import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { scrapeJobPage } from '@/lib/scrape'
import { cleanJobUrl } from '@/lib/url'

function getBearerToken(req: NextRequest): string {
  const auth = req.headers.get('authorization') ?? ''
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return (req.headers.get('x-shortcuts-token') ?? '').trim()
}

async function getOrCreateInboxCompanyId(): Promise<number> {
  const { rows: existing } = await sql`
    SELECT id FROM companies WHERE lower(name) = lower('Inbox') LIMIT 1
  `
  if (existing.length) return existing[0].id as number

  const { rows: created } = await sql`
    INSERT INTO companies (name, url, careers_url, tier, tag, sort_order)
    VALUES ('Inbox', '', '', 5, 'system', 0)
    RETURNING id
  `
  return created[0].id as number
}

async function findCompanyIdByName(name: string): Promise<number | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const { rows } = await sql`
    SELECT id FROM companies WHERE lower(name) = lower(${trimmed}) LIMIT 1
  `
  return rows.length ? (rows[0].id as number) : null
}

async function findCompanyIdByHost(host: string): Promise<number | null> {
  const h = host.replace(/^www\./i, '').trim()
  if (!h) return null

  const needle = `%${h}%`
  const { rows } = await sql`
    SELECT id FROM companies
    WHERE (url ILIKE ${needle} AND url <> '')
       OR (careers_url ILIKE ${needle} AND careers_url <> '')
    LIMIT 1
  `
  return rows.length ? (rows[0].id as number) : null
}

export async function POST(req: NextRequest) {
  const expected = process.env.SHORTCUTS_TOKEN ?? ''
  if (!expected) {
    return NextResponse.json({ error: 'SHORTCUTS_TOKEN not set' }, { status: 500 })
  }

  const token = getBearerToken(req)
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const rawUrl = String(body?.url ?? '')
    const url = cleanJobUrl(rawUrl)
    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'url required' }, { status: 400 })
    }

    const requestedCompanyId =
      typeof body?.company_id === 'number' && Number.isFinite(body.company_id) ? body.company_id : null

    let scrapedTitle = ''
    let scrapedCompany = ''
    let description = ''

    try {
      const scraped = await scrapeJobPage(url)
      scrapedTitle = scraped.jobTitle
      scrapedCompany = scraped.company
      description = scraped.description
    } catch {
      // Best effort. Some job boards block server-side fetch.
    }

    const host = (() => {
      try {
        return new URL(url).hostname
      } catch {
        return ''
      }
    })()

    const inferredCompanyId =
      requestedCompanyId ??
      (scrapedCompany ? await findCompanyIdByName(scrapedCompany) : null) ??
      (host ? await findCompanyIdByHost(host) : null) ??
      (await getOrCreateInboxCompanyId())

    const notes =
      typeof body?.notes === 'string' && body.notes.trim()
        ? body.notes.trim()
        : inferredCompanyId
          ? scrapedCompany && requestedCompanyId == null
            ? `scraped_company: ${scrapedCompany}`
            : ''
          : ''

    const title =
      typeof body?.title === 'string' && body.title.trim()
        ? body.title.trim()
        : scrapedTitle || ''

    const { rows } = await sql`
      INSERT INTO jobs (company_id, title, url, status, notes, salary_range, match_quality, date_applied)
      VALUES (${inferredCompanyId}, ${title}, ${url}, 'new', ${notes}, '', '', null)
      RETURNING *
    `

    return NextResponse.json(
      {
        job: rows[0],
        scraped: {
          title: scrapedTitle,
          company: scrapedCompany,
          description: description ? description.slice(0, 500) : '',
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to add job' }, { status: 500 })
  }
}

