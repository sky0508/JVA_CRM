import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const supabase = createServiceClient()

  const { data: contact, error: fetchError } = await supabase
    .from('contacts').select('company_id').eq('id', id).single()
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 })

  await supabase
    .from('contacts')
    .delete()
    .eq('company_id', contact.company_id)
    .neq('id', id)

  const { data, error } = await supabase
    .from('contacts').update({ is_primary: true }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
