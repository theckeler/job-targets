import { NextRequest, NextResponse } from 'next/server'

function extract(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? ''
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

    // og:title — most reliable for job title on job boards
    const ogTitle = extract(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || extract(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)

    // og:site_name — usually the company or job board name
    const ogSiteName = extract(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
      || extract(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)

    // <title> tag fallback
    const pageTitle = extract(html, /<title[^>]*>([^<]+)<\/title>/i)

    // First h1 on the page — often the job title itself
    const h1 = extract(html, /<h1[^>]*>([^<]+)<\/h1>/i)

    // Build best guesses
    // Job title: prefer h1 if it looks like a title, then cleaned ogTitle, then cleaned pageTitle
    const rawTitle = h1 || ogTitle || pageTitle
    const jobTitle = rawTitle ? cleanJobTitle(rawTitle) : ''

    // Company name: prefer og:site_name, then try to extract suffix from pageTitle
    let company = ogSiteName
    if (!company && pageTitle) {
      // Try "Title | Company" or "Title - Company" patterns
      const match = pageTitle.match(/[\|–—-]\s*([A-Z][^|–—-]+)$/)
      if (match) company = match[1].trim()
    }

    return NextResponse.json({ jobTitle, company, ogTitle, pageTitle, h1 })
  } catch {
    return NextResponse.json({ error: 'failed to scrape' }, { status: 500 })
  }
}
