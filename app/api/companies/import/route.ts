import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

const VALID_STATUSES = ['untouched', 'step1', 'approved', 'step2', 'followup', 'negotiating', 'listed', 'closed']

interface CsvRow {
  company_name: string
  linkedin_url?: string
  contact_status?: string
  notes?: string
  contact_name?: string
  contact_email?: string
  contact_linkedin_url?: string
  contact_lang?: string
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const supabase = createServiceClient()
  const { rows }: { rows: CsvRow[] } = await req.json()

  const errors: string[] = []
  const validRows: CsvRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.company_name?.trim()) {
      errors.push(`Row ${i + 1}: company_name is required`)
      continue
    }
    const status = row.contact_status || 'untouched'
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`Row ${i + 1}: invalid contact_status "${status}"`)
      continue
    }
    validRows.push({ ...row, contact_status: status })
  }

  // Get existing company names
  const { data: existingCompanies } = await supabase.from('companies').select('name')
  const existingNames = new Set((existingCompanies ?? []).map((c: { name: string }) => c.name.toLowerCase()))

  const toInsert = validRows.filter(r => !existingNames.has(r.company_name.trim().toLowerCase()))
  const skipped = validRows.length - toInsert.length

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped, errors })
  }

  // Batch insert companies
  const { data: insertedCompanies, error: companyError } = await supabase
    .from('companies')
    .insert(toInsert.map(r => ({
      name: r.company_name.trim(),
      linkedin_url: r.linkedin_url || null,
      contact_status: r.contact_status,
      notes: r.notes || null,
    })))
    .select('id, name')

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 })
  }

  // Insert contacts for rows that have contact_name
  const companyMap = new Map((insertedCompanies ?? []).map((c: { id: string; name: string }) => [c.name.toLowerCase(), c.id]))

  const contactsToInsert = toInsert
    .filter(r => r.contact_name?.trim())
    .map(r => ({
      company_id: companyMap.get(r.company_name.trim().toLowerCase()),
      name: r.contact_name!.trim(),
      email: r.contact_email || null,
      linkedin_url: r.contact_linkedin_url || null,
      lang: r.contact_lang || 'JA',
      is_primary: true,
    }))
    .filter(c => c.company_id)

  if (contactsToInsert.length > 0) {
    await supabase.from('contacts').insert(contactsToInsert)
  }

  return NextResponse.json({ imported: toInsert.length, skipped, errors })
}
