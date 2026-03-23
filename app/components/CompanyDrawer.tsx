'use client'
import { useState, useEffect } from 'react'
import type { Company, ContactStatus, OutreachHistory } from '@/lib/supabase'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/supabase'
import OutreachComposer from './OutreachComposer'
import ContactsSection from './ContactsSection'

interface Props {
  company: Company
  onClose: () => void
  onUpdate: (updated: Company) => void
}

const STATUSES: ContactStatus[] = ['untouched','step1','approved','step2','followup','negotiating','listed','closed']

export default function CompanyDrawer({ company, onClose, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...company })
  const [history, setHistory] = useState<OutreachHistory[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/companies/${company.id}`)
      .then(r => r.json())
      .then(data => {
        setHistory(data.outreach_history ?? [])
        setForm({ ...data })
      })
  }, [company.id])

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        contact_status: form.contact_status,
        notes: form.notes,
      }),
    })
    const updated = await res.json()
    onUpdate(updated)
    setEditing(false)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[480px] bg-white shadow-xl overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              {editing ? (
                <input
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="text-xl font-bold border-b border-gray-300 focus:outline-none"
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
              )}
              <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[form.contact_status]}`}>
                {STATUS_LABELS[form.contact_status]}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          <ContactsSection companyId={company.id} companyName={company.name} />

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">ステータス</label>
              {editing ? (
                <select value={form.contact_status}
                  onChange={e => setForm({...form, contact_status: e.target.value as ContactStatus})}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{STATUS_LABELS[form.contact_status]}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">メモ</label>
              {editing ? (
                <textarea value={form.notes ?? ''} onChange={e => setForm({...form, notes: e.target.value})}
                  rows={3} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
              ) : (
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{form.notes ?? '—'}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-8">
            {editing ? (
              <>
                <button onClick={save} disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                  {saving ? '保存中...' : '保存'}
                </button>
                <button onClick={() => { setForm({...company}); setEditing(false) }}
                  className="px-4 py-2 border text-sm rounded hover:bg-gray-50">キャンセル</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 border text-sm rounded hover:bg-gray-50">編集</button>
            )}
          </div>

          <div className="border-t pt-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">アウトリーチ送信</h3>
            <OutreachComposer companyId={company.id} onSent={() => {
              fetch(`/api/companies/${company.id}`)
                .then(r => r.json())
                .then(data => setHistory(data.outreach_history ?? []))
            }} />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">アウトリーチ履歴</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">履歴なし</p>
            ) : (
              <ul className="space-y-3">
                {history.map(h => (
                  <li key={h.id} className="flex gap-3">
                    <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 self-start mt-0.5">{h.type}</span>
                    <div>
                      <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('ja-JP')}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{h.message?.slice(0, 100)}{h.message && h.message.length > 100 ? '...' : ''}</p>
                      <span className={`text-xs px-1.5 rounded ${h.status === 'sent' ? 'text-green-600' : h.status === 'failed' ? 'text-red-500' : h.status === 'replied' ? 'text-blue-600' : 'text-gray-400'}`}>
                        {h.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
