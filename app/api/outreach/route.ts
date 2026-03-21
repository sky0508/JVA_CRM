import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { company_id, type, message } = await req.json()

  if (!company_id || !type || !message) {
    return NextResponse.json({ error: 'company_id, type, message are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('outreach_history')
    .insert({ company_id, type, message, status: 'queued' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
