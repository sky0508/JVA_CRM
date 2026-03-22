// Note: This page lives outside (dashboard) route group, so it has its own header.
'use client'
import { useState, useEffect } from 'react'

interface Member {
  id: string
  email: string
  role: 'admin' | 'member'
  created_at: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function fetchMembers() {
    const res = await fetch('/api/admin/members')
    if (res.ok) setMembers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    if (res.ok) {
      setMessage(`招待メールを送信しました: ${inviteEmail}`)
      setInviteEmail('')
    } else {
      const { error } = await res.json()
      setMessage(`エラー: ${error}`)
    }
  }

  async function handleRoleChange(id: string, role: string) {
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      setMessage(`エラー: ${error}`)
    }
    await fetchMembers()
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`${email} を削除しますか？`)) return
    const res = await fetch('/api/admin/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      setMessage(`エラー: ${error}`)
    }
    await fetchMembers()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">← CRM</a>
          <h1 className="text-xl font-semibold text-gray-900">メンバー管理</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">メンバーを招待</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              招待
            </button>
          </form>
          {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">メール</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ロール</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
              ) : members.map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{m.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(m.id, m.email)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
