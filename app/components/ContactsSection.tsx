'use client'
import { useState, useEffect } from 'react'
import type { Contact } from '@/lib/supabase'

function applyTemplate(template: string, contact: Contact, companyName: string) {
  return template
    .replace(/\{\{contact_name\}\}/g, contact.name)
    .replace(/\{\{company_name\}\}/g, companyName)
}

interface Template { id: string; name: string; content: string; type: string }

interface Props {
  companyId: string
  companyName: string
}

export default function ContactsSection({ companyId, companyName }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', email: '', linkedin_url: '', linkedin_url_type: 'personal', lang: 'JA' })
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch(`/api/contacts?company_id=${companyId}`)
      .then(r => r.json()).then(setContacts)
    fetch('/api/templates?type=linkedin_dm')
      .then(r => r.json()).then(setTemplates)
  }, [companyId])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const openLinkedIn = async (contact: Contact) => {
    const tid = selectedTemplate[contact.id]
    const tmpl = templates.find(t => t.id === tid)
    if (tmpl) {
      const msg = applyTemplate(tmpl.content, contact, companyName)
      await navigator.clipboard.writeText(msg)
      showToast('メッセージをコピーしました。LinkedInでペーストしてください')
    }
    if (contact.linkedin_url) window.open(contact.linkedin_url, '_blank')
  }

  const setPrimary = async (contact: Contact) => {
    if (!confirm(`${contact.name}をメインに設定し、他の担当者を削除しますか？`)) return
    await fetch(`/api/contacts/${contact.id}/set-primary`, { method: 'POST' })
    const res = await fetch(`/api/contacts?company_id=${companyId}`)
    setContacts(await res.json())
  }

  const deleteContact = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const addContact = async () => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newContact, company_id: companyId }),
    })
    const created = await res.json()
    setContacts(prev => [...prev, created])
    setAdding(false)
    setNewContact({ name: '', email: '', linkedin_url: '', linkedin_url_type: 'personal', lang: 'JA' })
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-700">担当者</h3>
        <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:underline">+ 追加</button>
      </div>

      {toast && (
        <div className="mb-2 text-xs bg-green-50 text-green-700 px-3 py-2 rounded">{toast}</div>
      )}

      <div className="space-y-3">
        {contacts.map(c => (
          <div key={c.id} className={`border rounded-lg p-3 text-sm ${c.is_primary ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium">{c.is_primary ? '★ ' : ''}{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">{c.lang}</span>
              </div>
              <button onClick={() => deleteContact(c.id)} className="text-gray-300 hover:text-red-400 text-xs">削除</button>
            </div>
            {c.email && <p className="text-gray-500 mt-1">📧 {c.email}</p>}
            {c.linkedin_url && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{c.linkedin_url_type ?? 'personal'}</span>
                <select
                  value={selectedTemplate[c.id] ?? ''}
                  onChange={e => setSelectedTemplate(prev => ({ ...prev, [c.id]: e.target.value }))}
                  className="text-xs border rounded px-1.5 py-1"
                >
                  <option value="">テンプレートを選択</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  onClick={() => openLinkedIn(c)}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  LinkedIn を開く
                </button>
              </div>
            )}
            {!c.is_primary && contacts.length > 1 && (
              <button onClick={() => setPrimary(c)} className="mt-2 text-xs text-gray-400 hover:text-blue-600">
                メインに設定
              </button>
            )}
          </div>
        ))}
        {contacts.length === 0 && !adding && (
          <p className="text-sm text-gray-400">担当者なし</p>
        )}
      </div>

      {adding && (
        <div className="mt-3 border rounded-lg p-3 space-y-2 text-sm">
          <input placeholder="担当者名 *" value={newContact.name}
            onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm" />
          <input placeholder="メール" value={newContact.email}
            onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm" />
          <input placeholder="LinkedIn URL" value={newContact.linkedin_url}
            onChange={e => setNewContact(p => ({ ...p, linkedin_url: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm" />
          <div className="flex gap-2">
            <select value={newContact.linkedin_url_type}
              onChange={e => setNewContact(p => ({ ...p, linkedin_url_type: e.target.value }))}
              className="border rounded px-2 py-1 text-xs">
              <option value="personal">personal</option>
              <option value="company">company</option>
            </select>
            <select value={newContact.lang}
              onChange={e => setNewContact(p => ({ ...p, lang: e.target.value }))}
              className="border rounded px-2 py-1 text-xs">
              <option value="JA">JA</option>
              <option value="EN">EN</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={addContact} disabled={!newContact.name}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50">追加</button>
            <button onClick={() => setAdding(false)} className="text-xs border px-3 py-1 rounded">キャンセル</button>
          </div>
        </div>
      )}
    </div>
  )
}
