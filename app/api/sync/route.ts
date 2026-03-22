import { NextRequest, NextResponse } from 'next/server'
import { syncMdToDb } from '@/lib/sync'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const { direction = 'md_to_db' } = await req.json().catch(() => ({}))
  const workspacePath = process.env.WORKSPACE_PATH ?? '/Users/sorasasaki/claude-workspace'

  if (direction === 'md_to_db' || direction === 'both') {
    const count = await syncMdToDb(workspacePath)
    return NextResponse.json({ results: [`md_to_db: ${count} companies synced`] })
  }

  return NextResponse.json({ results: ['no sync direction matched'] })
}
