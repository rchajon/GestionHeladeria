import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/database.types'
import { Breadcrumb } from '@/components/dashboard/breadcrumb'
import { Sidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type ProfileRow = { full_name: string; role: UserRole; business_name: string | null; email: string }
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, role, business_name, email')
    .eq('id', user!.id)
    .single()
  const profile = (profileData ?? null) as ProfileRow | null
  const role: UserRole = profile?.role ?? 'client'

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* ── Sidebar (Client Component — handles active state & mobile) ── */}
      <Sidebar
        role={role}
        fullName={profile?.full_name ?? ''}
        businessName={profile?.business_name ?? null}
        email={profile?.email ?? ''}
      />

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
          {/* On mobile, leave space for the hamburger button */}
          <div className="pl-10 lg:pl-0">
            <Breadcrumb />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 hidden sm:block">
              {profile?.business_name ?? profile?.full_name}
            </span>
          </div>
        </header>
        <div className="p-6 animate-fade-in">{children}</div>
      </main>
    </div>
  )
}
