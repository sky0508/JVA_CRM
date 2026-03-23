'use client'
import { useState, useEffect } from 'react'
import type { Contact, Company } from '@/lib/supabase'

interface Template {
  id: string
  name: string
  type: string
  body: string
}

interface Props {
  type: 'linkedin' | 'email'
  contact: Contact
  company: Company
  onClose: () => void
}

function applySubstitution(body: string, contact: Contact, company: Company): string {
  return body
    .replace(/\{\{contact_name\}\}/g, contact.name)
    .replace(/\{\{company_name\}\}/g, company.name)
}

export default function OutreachModal({ type, contact, company, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templateType = type === 'linkedin' ? 'linkedin_dm' : 'email'

  useEffect(() => {
    fetch(`/api/templates?type=${templateType}`)
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [templateType])

  const selectedTemplate = templates.find(t => t.id === selectedId)
  const preview = selectedTemplate ? applySubstitution(selectedTemplate.body, contact, company) : ''

  const handleConfirm = async () => {
    if (!selectedTemplate) return
    setSending(true)
    setError(null)

    if (type === 'linkedin') {
      await navigator.clipboard.writeText(preview)
      window.open(contact.linkedin_url!, '_blank')
      onClose()
    } else {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          contact_id: contact.id,
          type: 'email',
          message: preview,
        }),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(onClose, 1200)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to send')
        setSending(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {type === 'linkedin' ? 'LinkedIn DM' : 'Send Email'} — {contact.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading templates…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-400">No {templateType} templates found.</p>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— select a template —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {preview && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Preview</label>
                <div className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto bg-gray-50">
                  {preview}
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Email queued successfully.</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || sending || success}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {type === 'linkedin' ? 'Copy & Open LinkedIn' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
