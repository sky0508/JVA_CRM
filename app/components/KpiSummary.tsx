'use client'
import { useEffect, useState } from 'react'
import type { ContactStatus } from '@/lib/supabase'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/supabase'

const STATUSES: ContactStatus[] = ['untouched','step1','approved','step2','followup','negotiating','listed','closed']

export default function KpiSummary() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [weekSent, setWeekSent] = useState(0)

  useEffect(() => {
    fetch('/api/companies')
      .then(r => r.json())
      .then((companies: Array<{ contact_status: string }>) => {
        const c: Record<string, number> = {}
        for (const s of STATUSES) c[s] = 0
        for (const co of companies) c[co.contact_status] = (c[co.contact_status] ?? 0) + 1
        setCounts(c)
      })
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    fetch(`/api/outreach/stats?since=${weekAgo}`)
      .then(r => r.json())
      .then(d => setWeekSent(d.count ?? 0))
      .catch(() => {})
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 mb-6">
      {STATUSES.map(s => (
        <div key={s} className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{counts[s] ?? 0}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[s]}`}>{STATUS_LABELS[s]}</span>
        </div>
      ))}
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <p className="text-2xl font-bold text-blue-600">{weekSent}</p>
        <p className="text-xs text-gray-500 mt-1">今週送信</p>
      </div>
    </div>
  )
}
