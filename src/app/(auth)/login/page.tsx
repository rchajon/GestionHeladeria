import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Iniciar Sesión – Helados Sombrilla' }

export default function LoginPage() {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Bienvenido de vuelta</h2>
        <p className="text-slate-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
      </div>
      <LoginForm />
    </div>
  )
}
