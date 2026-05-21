import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Crear Cuenta – Helados Sombrilla' }

export default function RegisterPage() {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Crear Cuenta de Revendedor</h2>
        <p className="text-slate-400 text-sm mt-1">Completa tu información de negocio</p>
      </div>
      <RegisterForm />
    </div>
  )
}
