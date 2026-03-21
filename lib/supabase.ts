import { createClient } from '@supabase/supabase-js'

export type ContactStatus =
  | 'untouched' | 'step1' | 'approved' | 'step2'
  | 'followup' | 'negotiating' | 'listed' | 'closed'

export interface Company {
  id: string
  name: string
  linkedin_url: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  contact_status: ContactStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OutreachHistory {
  id: string
  company_id: string
  type: 'email' | 'linkedin_dm' | 'form'
  message: string | null
  status: 'queued' | 'sent' | 'failed' | 'replied'
  sent_at: string | null
  created_at: string
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const STATUS_LABELS: Record<ContactStatus, string> = {
  untouched: '未着手',
  step1: 'Step1',
  approved: '承認済',
  step2: 'Step2',
  followup: 'フォローアップ',
  negotiating: '商談中',
  listed: '掲載完了',
  closed: 'クローズ',
}

export const STATUS_COLORS: Record<ContactStatus, string> = {
  untouched: 'bg-gray-100 text-gray-600',
  step1: 'bg-blue-100 text-blue-700',
  approved: 'bg-yellow-100 text-yellow-700',
  step2: 'bg-orange-100 text-orange-700',
  followup: 'bg-purple-100 text-purple-700',
  negotiating: 'bg-green-100 text-green-700',
  listed: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-red-100 text-red-600',
}
