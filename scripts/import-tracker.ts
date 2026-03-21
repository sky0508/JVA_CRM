import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// .env.local をロード
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STATUS_MAP: Record<string, string> = {
  '未着手': 'untouched',
  'Step1': 'step1',
  '承認済': 'approved',
  'Step2': 'step2',
  'FU1': 'followup',
  'FU2': 'followup',
  '返信あり': 'negotiating',
  '商談中': 'negotiating',
  '掲載完了': 'listed',
  'クローズ': 'closed',
}

interface RawRow {
  name: string
  contactName: string
  step: string
  notes: string
  email?: string
}

function parseTrackerMarkdown(content: string): RawRow[] {
  const rows: RawRow[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cells[0] === '#' || cells[0].startsWith('-')) continue
    if (!/^\d+$/.test(cells[0])) continue

    const name = cells[1] ?? ''
    const contactName = cells[2] ?? ''
    const step = cells[4] ?? cells[3] ?? '未着手'
    const notes = cells[cells.length - 1] ?? ''
    const emailMatch = notes.match(/[\w.-]+@[\w.-]+\.\w+/)

    rows.push({
      name: name.replace(/\*\*/g, ''),
      contactName: contactName === '(HR要調査)' || contactName === '(CEO直)' ? '' : contactName,
      step: step.replace(/\*\*/g, ''),
      notes,
      email: emailMatch?.[0],
    })
  }

  return rows
}

async function importTracker() {
  const workspacePath = process.env.WORKSPACE_PATH ?? '/Users/sorasasaki/claude-workspace'
  const trackerPath = path.join(workspacePath, 'company_jva/dep_IB/sales/outreach-tracker.md')

  if (!fs.existsSync(trackerPath)) {
    console.error(`File not found: ${trackerPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(trackerPath, 'utf-8')
  const rows = parseTrackerMarkdown(content)

  console.log(`Parsed ${rows.length} companies from tracker`)

  for (const row of rows) {
    const status = STATUS_MAP[row.step] ?? 'untouched'

    const { error } = await supabase
      .from('companies')
      .upsert({
        name: row.name,
        contact_name: row.contactName || null,
        email: row.email || null,
        contact_status: status,
        notes: row.notes || null,
      }, { onConflict: 'name' })

    if (error) {
      console.error(`Error importing ${row.name}:`, error.message)
    } else {
      console.log(`✓ ${row.name} (${status})`)
    }
  }

  console.log('Import complete!')
}

importTracker().catch(console.error)
