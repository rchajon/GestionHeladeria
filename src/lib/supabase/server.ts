// ============================================================
// lib/supabase/server.ts
// Server-side Supabase client (for Server Components & Actions)
// ============================================================
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // We intentionally do NOT pass the Database generic here.
  // Supabase's inferred types from .select() are often `never` for
  // .insert() / .update() on manually-written Database interfaces.
  // Types for query RESULTS are cast explicitly in each action/component.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In Server Components, cookies can only be set from
            // Server Actions or Route Handlers — safely ignored here.
          }
        },
      },
    }
  )
}

/**
 * Admin client that bypasses RLS (uses service_role key).
 * ONLY use in trusted server-side code. NEVER expose to the client.
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth:    { persistSession: false },
    }
  )
}
