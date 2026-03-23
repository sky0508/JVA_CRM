/**
 * contactsテーブル データ移行スクリプト
 * 実行: npx tsx scripts/run-migration.ts
 *
 * テーブルはSupabase SQL Editorで作成済みの前提でデータ移行のみ実行する
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [key, ...v] = line.split('=')
    if (key && v.length) process.env[key.trim()] = v.join('=').trim()
  }
}

async function main() {
  console.log('🔧 既存担当者データを移行...')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: companies, error: fetchError } = await supabase
    .from('companies')
    .select('id, contact_name, email, linkedin_url')

  if (fetchError) { console.error(fetchError); process.exit(1) }

  const contacts = (companies ?? [])
    .filter((c: any) => c.contact_name)
    .map((c: any) => ({
      company_id: c.id,
      name: c.contact_name,
      email: c.email ?? null,
      linkedin_url: c.linkedin_url ?? null,
      linkedin_url_type: c.linkedin_url ? 'personal' : null,
      lang: 'JA',
      is_primary: true,
    }))

  if (contacts.length > 0) {
    const { error } = await supabase.from('contacts').insert(contacts)
    if (error) { console.error(error); process.exit(1) }
    console.log(`✅ ${contacts.length}件の担当者を移行しました`)
  } else {
    console.log('ℹ️  移行対象の担当者データなし')
  }

  console.log('\n🎉 マイグレーション完了！')
}

main().catch(e => { console.error(e); process.exit(1) })
