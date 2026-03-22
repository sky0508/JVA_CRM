import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  const { id, role } = await req.json()
  if (!id || !role) return NextResponse.json({ error: 'id and role required' }, { status: 400 })
  if (!['admin', 'member'].includes(role)) return NextResponse.json({ error: 'invalid role' }, { status: 400 })
  if (id === authResult.user.id && role === 'member') {
    return NextResponse.json({ error: '自分自身のロールを降格できません' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (id === authResult.user.id) {
    return NextResponse.json({ error: '自分自身を削除できません' }, { status: 400 })
  }

  const { error } = await getServiceClient().auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
