'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-3xl">
        ⚠
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Algo salió mal</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          {error.message?.includes('fetch') || error.message?.includes('network')
            ? 'No se pudo conectar con el servidor. Verifica tu conexión.'
            : error.message || 'Error inesperado al cargar este módulo.'
          }
        </p>
      </div>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium transition-colors"
      >
        ↺ Reintentar
      </button>
    </div>
  )
}
