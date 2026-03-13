import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const { rows: companies } = await sql`
      SELECT c.*, COUNT(j.id) as job_count
      FROM companies c
      LEFT JOIN jobs j ON j.company_id = c.id
      GROUP BY c.id
      ORDER BY c.tier ASC, c.sort_order ASC, c.name ASC
    `
    const { rows: jobs } = await sql`
      SELECT * FROM jobs ORDER BY date_applied DESC, created_at DESC
    `
    const result = companies.map(company => ({
      ...company,
      jobs: jobs.filter(j => j.company_id === company.id),
    }))
    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await sql`DELETE FROM jobs WHERE company_id = ${id}`
    await sql`DELETE FROM companies WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, url, careers_url, tier = 3, tag = '', sort_order = 999 } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const { rows } = await sql`
      INSERT INTO companies (name, url, careers_url, tier, tag, sort_order)
      VALUES (${name}, ${url}, ${careers_url}, ${tier}, ${tag}, ${sort_order})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, name, url, careers_url, tier, tag, sort_order } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const { rows } = await sql`
      UPDATE companies SET
        name        = COALESCE(${name},        name),
        url         = COALESCE(${url},         url),
        careers_url = COALESCE(${careers_url}, careers_url),
        tier        = COALESCE(${tier},        tier),
        tag         = COALESCE(${tag},         tag),
        sort_order  = COALESCE(${sort_order},  sort_order)
      WHERE id = ${id}
      RETURNING *
    `
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
