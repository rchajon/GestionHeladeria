'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/database.types'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { updateClientProfile } from '@/actions/clients'

interface ProfileClientProps {
  profile: Profile
  email:   string
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  admin:  { label: 'Administrador',    color: 'text-amber-400', icon: '⚡' },
  client: { label: 'Revendedor / Cliente', color: 'text-cyan-400', icon: '🛒' },
}

export function ProfileClient({ profile, email }: ProfileClientProps) {
  const [editing, setEditing]    = useState(false)
  const [loading, setLoading]    = useState(false)
  const { show, ToastComponent } = useToast()

  const roleInfo = ROLE_LABELS[profile.role] ?? ROLE_LABELS.client

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result   = await updateClientProfile(profile.id, formData)
    setLoading(false)
    if (!result.success) { show(result.error, 'error'); return }
    show('Perfil actualizado correctamente.', 'success')
    setEditing(false)
    window.location.reload()
  }

  return (
    <>
      {ToastComponent}
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
          <p className="text-slate-400 text-sm mt-0.5">Información de tu cuenta y negocio</p>
        </div>

        {/* Avatar + role card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-cyan-500/20">
            {profile.full_name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-white">{profile.full_name}</p>
            <p className="text-sm text-slate-400">{email}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${roleInfo.color}`}>
              {roleInfo.icon} {roleInfo.label}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Miembro desde<br />
            <span className="text-slate-400">{formatDate(profile.created_at)}</span>
          </p>
        </div>

        {/* Info form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Datos del Negocio</h2>
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <FormField label="Nombre completo" required>
                <Input name="full_name" defaultValue={profile.full_name} required />
              </FormField>
              <FormField label="Nombre del negocio" required>
                <Input name="business_name" defaultValue={profile.business_name ?? ''} required />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Teléfono">
                  <Input name="phone" defaultValue={profile.phone ?? ''} placeholder="+502 0000 0000" />
                </FormField>
                <FormField label="NIT / RFC / RUC">
                  <Input name="tax_id" defaultValue={profile.tax_id ?? ''} placeholder="123456789" />
                </FormField>
              </div>
              <FormField label="Dirección">
                <Input name="address" defaultValue={profile.address ?? ''} placeholder="Ciudad, País" />
              </FormField>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button type="submit" loading={loading}>Guardar Cambios</Button>
              </div>
            </form>
          ) : (
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Nombre completo',    value: profile.full_name },
                { label: 'Nombre del negocio', value: profile.business_name ?? '—' },
                { label: 'Teléfono',           value: profile.phone    ?? '—' },
                { label: 'NIT / RFC / RUC',    value: profile.tax_id   ?? '—' },
                { label: 'Dirección',          value: profile.address  ?? '—' },
                { label: 'Correo electrónico', value: email },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm text-white font-medium">{f.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Seguridad</h2>
          <div className="flex items-center justify-between py-3 border-b border-slate-800">
            <div>
              <p className="text-sm text-white">Contraseña</p>
              <p className="text-xs text-slate-500">Última actualización desconocida</p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg">
              Cambio de contraseña via email
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-white">Autenticación</p>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              ✓ Activo
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
