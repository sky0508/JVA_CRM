import { createServiceClient } from '@/lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const STATUS_MAP: Record<string, string> = {
  '未着手': 'untouched', 'Step1': 'step1', '承認済': 'approved',
  'Step2': 'step2', 'FU1': 'followup', 'FU2': 'followup',
  '返信あり': 'negotiating', '商談中': 'negotiating',
  '掲載完了': 'listed', 'クローズ': 'closed',
}

const STATUS_REVERSE: Record<string, string> = {
  untouched: '未着手', step1: 'Step1', approved: '承認済',
  step2: 'Step2', followup: 'FU1', negotiating: '返信あり',
  listed: '掲載完了', closed: 'クローズ',
}

export function parseTrackerMarkdown(content: string) {
  const rows: { name: string; contactName: string; step: string; notes: string; email?: string }[] = []
  for (const line of content.split('\n')) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cells[0] === '#' || cells[0].startsWith('-') || !/^\d+$/.test(cells[0])) continue
    const name = cells[1]?.replace(/\*\*/g, '') ?? ''
    const contactName = cells[2] ?? ''
    const step = (cells[4] ?? cells[3] ?? '未着手').replace(/\*\*/g, '')
    const notes = cells[cells.length - 1] ?? ''
    const emailMatch = notes.match(/[\w.-]+@[\w.-]+\.\w+/)
    rows.push({
      name,
      contactName: ['(HR要調査)', '(CEO直)'].includes(contactName) ? '' : contactName,
      step,
      notes,
      email: emailMatch?.[0],
    })
  }
  return rows
}

export async function syncMdToDb(workspacePath: string): Promise<number> {
  const supabase = createServiceClient()
  const trackerPath = path.join(workspacePath, 'company_jva/dep_IB/sales/outreach-tracker.md')
  const content = fs.readFileSync(trackerPath, 'utf-8')
  const rows = parseTrackerMarkdown(content)
  let count = 0
  for (const row of rows) {
    const status = STATUS_MAP[row.step] ?? 'untouched'
    await supabase.from('companies').upsert(
      { name: row.name, contact_name: row.contactName || null, email: row.email || null, contact_status: status, notes: row.notes || null },
      { onConflict: 'name' }
    )
    count++
  }
  return count
}

export async function syncDbToMd(workspacePath: string): Promise<number> {
  const supabase = createServiceClient()
  const { data: companies } = await supabase.from('companies').select('name, contact_status')
  if (!companies) return 0

  const trackerPath = path.join(workspacePath, 'company_jva/dep_IB/sales/outreach-tracker.md')
  let content = fs.readFileSync(trackerPath, 'utf-8')

  for (const company of companies) {
    const mdStatus = STATUS_REVERSE[company.contact_status] ?? company.contact_status
    const escaped = company.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // テーブル行のStep列をDBステータスで上書き（5列目）
    content = content.replace(
      new RegExp(`(\\|\\s*\\d+\\s*\\|\\s*\\*?\\*?${escaped}\\*?\\*?\\s*\\|[^|]*\\|[^|]*\\|)\\s*[^|]+?(\\s*\\|)`, 'g'),
      `$1 ${mdStatus}$2`
    )
  }

  fs.writeFileSync(trackerPath, content, 'utf-8')
  return companies.length
}
