import { NextRequest, NextResponse } from 'next/server'

function extract(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? ''
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanJobTitle(raw: string): string {
  // Common patterns: "Title | Company", "Title at Company", "Title - Company", "Title – Company"
  // Strip everything after first separator that's likely a company/site suffix
  return raw
    .replace(/\s*[\|–—]\s*.+$/, '')
    .replace(/\s+at\s+[A-Z].+$/, '')
    .replace(/\s+-\s+[A-Z].+$/, '')
    .trim()
}

function findJobPostingLdJson(html: string): {
  title?: string
  company?: string
  description?: string
  raw?: unknown
} | null {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => (m[1] ?? '').trim())
    .filter(Boolean)

  function isRecord(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object' && !Array.isArray(v)
  }

  function pick(obj: unknown): unknown[] {
    if (!obj) return []
    if (Array.isArray(obj)) return obj.flatMap(pick)
    if (!isRecord(obj)) return []
    const graph = obj['@graph']
    if (Array.isArray(graph)) return graph.flatMap(pick)
    return [obj]
  }

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw)
      const nodes = pick(parsed)
      const jp = nodes.find((n) => {
        if (!isRecord(n)) return false
        const t = n['@type']
        return t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting'))
      })
      if (jp) {
        if (!isRecord(jp)) continue
        const title = typeof jp.title === 'string' ? jp.title : undefined
        const company =
          isRecord(jp.hiringOrganization) && typeof jp.hiringOrganization.name === 'string'
            ? jp.hiringOrganization.name
            : isRecord(jp.organization) && typeof jp.organization.name === 'string'
              ? jp.organization.name
              : undefined
        const descriptionRaw = jp.description
        const description =
          typeof descriptionRaw === 'string'
            ? stripHtmlToText(descriptionRaw).slice(0, 6000)
            : undefined
        return { title, company, description, raw: jp }
      }
    } catch {
      // ignore
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobTracker/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 })

    const html = await res.text()

    // Structured data (best effort)
    const ld = findJobPostingLdJson(html)

    // og:title — most reliable for job title on job boards
    const ogTitle = extract(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || extract(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)

    const ogDescription =
      extract(
        html,
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      extract(
        html,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
      )

    const metaDescription =
      extract(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      extract(
        html,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      )

    // og:site_name — usually the company or job board name
    const ogSiteName = extract(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
      || extract(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)

    // <title> tag fallback
    const pageTitle = extract(html, /<title[^>]*>([^<]+)<\/title>/i)

    // First h1 on the page — often the job title itself
    const h1 = extract(html, /<h1[^>]*>([^<]+)<\/h1>/i)

    // Build best guesses
    // Job title: prefer h1 if it looks like a title, then cleaned ogTitle, then cleaned pageTitle
    const rawTitle = ld?.title || h1 || ogTitle || pageTitle
    const jobTitle = rawTitle ? cleanJobTitle(rawTitle) : ''

    // Company name: prefer og:site_name, then try to extract suffix from pageTitle
    let company = ld?.company || ogSiteName
    if (!company && pageTitle) {
      // Try "Title | Company" or "Title - Company" patterns
      const match = pageTitle.match(/[\|–—-]\s*([A-Z][^|–—-]+)$/)
      if (match) company = match[1].trim()
    }

    const description =
      ld?.description ||
      (ogDescription ? ogDescription.trim() : '') ||
      (metaDescription ? metaDescription.trim() : '')

    return NextResponse.json({
      jobTitle,
      company,
      description,
      ogTitle,
      pageTitle,
      h1,
      hasLdJobPosting: Boolean(ld),
    })
  } catch {
    return NextResponse.json({ error: 'failed to scrape' }, { status: 500 })
  }
}
