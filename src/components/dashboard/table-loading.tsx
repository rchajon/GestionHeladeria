export default function TablePageLoading({ title = 'Cargando...' }: { title?: string }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-slate-800 rounded-xl mb-2" />
          <div className="h-3 w-28 bg-slate-800 rounded-full" />
        </div>
        <div className="h-9 w-36 bg-slate-800 rounded-xl" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex gap-3">
          <div className="h-8 w-48 bg-slate-800 rounded-lg" />
          <div className="h-8 w-32 bg-slate-800 rounded-lg" />
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-800">
            {[...Array(5)].map((_, i) => (
              <th key={i} className="py-3 px-4 first:pl-6">
                <div className="h-3 w-16 bg-slate-800 rounded-full" />
              </th>
            ))}
          </tr></thead>
          <tbody>
            {[...Array(6)].map((_, i) => (
              <tr key={i} className="border-b border-slate-800/60">
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="py-3 px-4 first:pl-6">
                    <div className="h-4 bg-slate-800 rounded-full" style={{ width: `${50 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
