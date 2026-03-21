'use client'
import { useState } from 'react'

interface Props {
  companyId: string
  onSent: () => void
}

export default function OutreachComposer({ companyId, onSent }: Props) {
  const [type, setType] = useState<'email' | 'linkedin_dm' | 'form'>('linkedin_dm')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    if (!message.trim()) return
    setSending(true)
    await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, type, message }),
    })
    setSent(true)
    setSending(false)
    setMessage('')
    onSent()
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['linkedin_dm', 'email', 'form'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 text-xs rounded border ${type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            {t === 'linkedin_dm' ? 'LinkedIn DM' : t === 'email' ? 'メール' : 'フォーム'}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="メッセージを入力..."
        rows={4}
        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={send}
        disabled={sending || !message.trim()}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? '送信中...' : sent ? '✓ キューに追加' : 'キューに送信'}
      </button>
    </div>
  )
}
