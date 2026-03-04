import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { company_id, title = '', url = '', notes = '', salary_range = '', match_quality = '', date_applied = '' } = await req.json()
    if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })
    const { rows } = await sql`
      INSERT INTO jobs (company_id, title, url, status, notes, salary_range, match_quality, date_applied)
      VALUES (${company_id}, ${title}, ${url}, 'new', ${notes}, ${salary_range}, ${match_quality}, ${date_applied || null})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to add job' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, title, url, notes, salary_range } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { rows } = await sql`
      UPDATE jobs SET
        status       = COALESCE(${status},       status),
        title        = COALESCE(${title},        title),
        url          = COALESCE(${url},          url),
        notes        = COALESCE(${notes},        notes),
        salary_range = COALESCE(${salary_range}, salary_range),
        updated_at   = NOW()
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

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await sql`DELETE FROM jobs WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
