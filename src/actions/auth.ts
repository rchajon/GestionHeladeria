'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/database.types'

export async function signIn(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const supabase     = await createClient()
  const email        = formData.get('email')         as string
  const password     = formData.get('password')      as string
  const fullName     = formData.get('full_name')     as string
  const businessName = formData.get('business_name') as string | null
  const taxId        = formData.get('tax_id')        as string | null
  const phone        = formData.get('phone')         as string | null

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error)      return { success: false, error: error.message }
  if (!data.user) return { success: false, error: 'Registration failed. Please try again.' }

  // Use the admin client (service_role) to bypass RLS when creating the initial profile.
  // The newly registered user does not yet have a confirmed session, so the anon client
  // would be blocked by the RLS INSERT policy on profiles.
  const admin = createAdminClient()
  const { error: profileError } = await admin.from('profiles').insert({
    id:            data.user.id,
    email,
    full_name:     fullName,
    business_name: businessName || null,
    tax_id:        taxId  || null,
    phone:         phone  || null,
    role:          'client',
  })

  if (profileError) {
    // Roll back: delete the auth user so the account doesn't become an orphan
    await admin.auth.admin.deleteUser(data.user.id)
    return { success: false, error: 'Error al crear perfil: ' + profileError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
