'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { signIn } from '@/actions/auth'

export function LoginForm() {
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result   = await signIn(formData)
    setLoading(false)
    if (result && !result.success) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Correo electrónico" required>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@empresa.com"
          autoComplete="email"
          required
        />
      </FormField>

      <FormField label="Contraseña" required>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </FormField>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
        Iniciar Sesión
      </Button>

      <p className="text-center text-sm text-slate-500">
        ¿Sin cuenta?{' '}
        <a href="/register" className="text-cyan-400 hover:text-cyan-300 transition font-medium">
          Registrarse
        </a>
      </p>
    </form>
  )
}
