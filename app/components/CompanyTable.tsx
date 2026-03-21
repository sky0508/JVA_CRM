'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Company, ContactStatus } from '@/lib/supabase'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/supabase'
import CompanyDrawer from './CompanyDrawer'

const STATUSES: ContactStatus[] = ['untouched','step1','approved','step2','followup','negotiating','listed','closed']

export default function CompanyTable() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortField, setSortField] = useState<keyof Company>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (search) params.set('search', search)
    const res = await fetch(`/api/companies?${params}`)
    const data = await res.json()
    setCompanies(data)
    setLoading(false)
  }, [search, filterStatus])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  const sorted = [...companies].sort((a, b) => {
    const va = a[sortField] ?? ''
    const vb = b[sortField] ?? ''
    return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
  })

  const toggleSort = (field: keyof Company) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
  }

  const Th = ({ field, label }: { field: keyof Company; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
      onClick={() => toggleSort(field)}
    >
      {label} {sortField === field ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div>
      <div className="flex gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="会社名で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全ステータス</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{companies.length}件</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th field="name" label="会社名" />
              <Th field="contact_name" label="担当者" />
              <Th field="contact_status" label="ステータス" />
              <Th field="email" label="メール" />
              <Th field="updated_at" label="更新日" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
            ) : sorted.map(company => (
              <tr
                key={company.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(company)}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{company.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{company.contact_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[company.contact_status]}`}>
                    {STATUS_LABELS[company.contact_status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{company.email ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(company.updated_at).toLocaleDateString('ja-JP')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <CompanyDrawer
          company={selected}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => {
            setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c))
            setSelected(updated)
          }}
        />
      )}
    </div>
  )
}
