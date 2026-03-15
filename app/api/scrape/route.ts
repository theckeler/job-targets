import { NextRequest, NextResponse } from 'next/server'
import { scrapeJobPage } from '@/lib/scrape'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  try {
    const data = await scrapeJobPage(url)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'failed to scrape' }, { status: 500 })
  }
}
