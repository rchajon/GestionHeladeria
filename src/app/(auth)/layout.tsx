import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Iniciar Sesión – Helados Sombrilla Artesanal',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-slate-800/60 mb-4 shadow-xl shadow-black/40 ring-1 ring-white/5">
            <Image
              src="/logo.png"
              alt="Helados Sombrilla Artesanal"
              width={96}
              height={96}
              className="w-full h-full object-contain rounded-3xl"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Helados Sombrilla Artesanal</h1>
          <p className="text-slate-400 text-sm mt-1">Sabores y Tradición de Guatemala</p>
        </div>
        {children}
      </div>
    </div>
  )
}
