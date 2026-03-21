import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// .env.local をロード
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...v] = line.split('=')
    if (key && v.length) process.env[key.trim()] = v.join('=').trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function importTemplates() {
  const workspacePath = process.env.WORKSPACE_PATH ?? '/Users/sorasasaki/claude-workspace'
  const tmplPath = path.join(workspacePath, 'company_jva/dep_IB/sales/linkedin-outreach-templates.md')

  if (!fs.existsSync(tmplPath)) {
    console.warn(`Templates file not found: ${tmplPath}`)
    console.log('Skipping template import.')
    return
  }

  const content = fs.readFileSync(tmplPath, 'utf-8')
  const blocks = content.split(/(?=^### )/m).filter(b => b.startsWith('### '))

  for (const block of blocks) {
    const nameMatch = block.match(/^### (.+)/)
    const name = nameMatch?.[1]?.trim() ?? 'Unnamed'
    const codeMatch = block.match(/```[\s\S]*?\n([\s\S]+?)```/)
    const templateContent = codeMatch?.[1]?.trim() ?? block.replace(/^### .+\n/, '').trim()

    const type = name.toLowerCase().includes('email') ? 'email'
      : name.toLowerCase().includes('form') ? 'form'
      : 'linkedin_dm'

    const { error } = await supabase.from('templates').upsert(
      { type, name, content: templateContent },
      { onConflict: 'name' }
    )
    if (error) console.error(`Error: ${name} — ${error.message}`)
    else console.log(`✓ ${name} (${type})`)
  }
  console.log('Templates import complete!')
}

importTemplates().catch(console.error)
