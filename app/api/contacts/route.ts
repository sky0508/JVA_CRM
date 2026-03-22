import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const company_id = new URL(req.url).searchParams.get('company_id')
  if (!company_id) return NextResponse.json([], { status: 400 })
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', company_id)
    .order('is_primary', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const body = await req.json()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert(body)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
