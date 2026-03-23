'use server'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase.server'

export async function login(_prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await getSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
