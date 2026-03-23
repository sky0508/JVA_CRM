import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import type { Contact } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  let query = supabase
    .from('companies')
    .select('*, contacts(id, name, email, linkedin_url, linkedin_url_type, lang, is_primary)')
  if (status) query = query.eq('contact_status', status)
  if (search) query = query.ilike('name', `%${search}%`)
  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const companies = (data ?? []).map((c: { contacts?: Contact[]; [key: string]: unknown }) => ({
    ...c,
    primary_contact: (c.contacts ?? []).find((ct: Contact) => ct.is_primary) ?? null,
    contacts: undefined,
  }))

  return NextResponse.json(companies)
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const supabase = createServiceClient()
  const body = await req.json()
  const { data, error } = await supabase.from('companies').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
