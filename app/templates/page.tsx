'use client'
import { useState, useEffect } from 'react'

interface Template { id: string; type: string; name: string; content: string }

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [form, setForm] = useState({ type: 'linkedin_dm', name: '', content: '' })
  const [editing, setEditing] = useState<Template | null>(null)

  const load = () => fetch('/api/templates').then(r => r.json()).then(setTemplates)
  useEffect(() => { load() }, [])

  const save = async () => {
    if (editing) {
      await fetch(`/api/templates/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setForm({ type: 'linkedin_dm', name: '', content: '' })
    setEditing(null)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">← CRM</a>
          <h1 className="text-xl font-semibold text-gray-900">テンプレート管理</h1>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
          <h2 className="font-medium">{editing ? 'テンプレートを編集' : '新規テンプレート'}</h2>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
            className="border rounded px-2 py-1 text-sm">
            <option value="linkedin_dm">LinkedIn DM</option>
            <option value="email">メール</option>
            <option value="form">フォーム</option>
          </select>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            placeholder="テンプレート名（例: Step1 JA）"
            className="w-full border rounded px-2 py-1 text-sm" />
          <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
            placeholder="内容（{{company_name}} 等の変数使用可）"
            rows={6} className="w-full border rounded px-2 py-1 text-sm font-mono" />
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">保存</button>
            {editing && <button onClick={() => { setEditing(null); setForm({ type: 'linkedin_dm', name: '', content: '' }) }}
              className="px-4 py-2 border text-sm rounded">キャンセル</button>}
          </div>
        </div>
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded shadow p-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 mr-2">{t.type}</span>
                <span className="font-medium text-sm">{t.name}</span>
                <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2">{t.content}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => { setEditing(t); setForm({ type: t.type, name: t.name, content: t.content }) }}
                  className="text-xs text-blue-600 hover:underline">編集</button>
                <button onClick={() => del(t.id)} className="text-xs text-red-500 hover:underline">削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
