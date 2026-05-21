import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, UserRole } from '@/lib/database.types'
import { ProfileClient } from '@/components/profile/profile-client'

export const metadata: Metadata = { title: 'Mi Perfil – Helados Sombrilla' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileRaw as Profile | null
  if (!profile) redirect('/login')

  return <ProfileClient profile={profile} email={user.email ?? ''} />
}
