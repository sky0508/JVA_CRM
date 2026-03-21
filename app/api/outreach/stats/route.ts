import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const since = new URL(req.url).searchParams.get('since')
  let query = supabase.from('outreach_history').select('id', { count: 'exact', head: true }).eq('status', 'sent')
  if (since) query = query.gte('sent_at', since)
  const { count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count })
}
