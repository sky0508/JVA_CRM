import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ---- Server client (Server Components, Server Actions, API Routes) ----
// This file imports next/headers and must NEVER be imported by Client Components.
export async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component rendering — cookie writes are ignored
          }
        },
      },
    }
  )
}
