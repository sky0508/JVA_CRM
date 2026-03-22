import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from './supabase'

// Returns the authenticated user, or a 401 NextResponse.
// Usage in API routes:
//   const result = await requireAuth()
//   if (result instanceof NextResponse) return result
//   const { user, supabase } = result
export async function requireAuth() {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { user, supabase }
}

// Returns the authenticated admin user, or a 401/403 NextResponse.
export async function requireAdmin() {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result

  const { user, supabase } = result
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user, supabase }
}
