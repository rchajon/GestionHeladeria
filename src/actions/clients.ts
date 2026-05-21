'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Profile } from '@/lib/database.types'

export async function getClients(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('business_name')
  return (data ?? []) as Profile[]
}

export async function toggleClientStatus(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/clients')
  return { success: true, data: null }
}

export async function updateClientProfile(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name:     formData.get('full_name')     as string,
      business_name: formData.get('business_name') as string,
      phone:         formData.get('phone')         as string || null,
      tax_id:        formData.get('tax_id')        as string || null,
      address:       formData.get('address')       as string || null,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/clients')
  return { success: true, data: null }
}
