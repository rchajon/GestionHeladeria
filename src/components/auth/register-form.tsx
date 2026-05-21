'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { signUp } from '@/actions/auth'

export function RegisterForm() {
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result   = await signUp(formData)
    setLoading(false)
    if (result && !result.success) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nombre completo" required>
          <Input name="full_name" placeholder="Juan Pérez" required />
        </FormField>
        <FormField label="Teléfono">
          <Input name="phone" type="tel" placeholder="+52 55 1234 5678" />
        </FormField>
      </div>

      <FormField label="Nombre del negocio" required>
        <Input name="business_name" placeholder="Distribuidora El Frío S.A." required />
      </FormField>

      <FormField label="NIT / RFC / RUC">
        <Input name="tax_id" placeholder="XAXX010101000" />
      </FormField>

      <FormField label="Correo electrónico" required>
        <Input name="email" type="email" placeholder="contacto@negocio.com" required />
      </FormField>

      <FormField label="Contraseña" required>
        <Input name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required />
      </FormField>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
        Crear Cuenta
      </Button>

      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-cyan-400 hover:text-cyan-300 transition font-medium">
          Iniciar Sesión
        </a>
      </p>
    </form>
  )
}
