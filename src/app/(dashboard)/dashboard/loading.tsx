export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-slate-800 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="w-11 h-11 bg-slate-800 rounded-xl mb-4" />
            <div className="h-7 w-24 bg-slate-800 rounded-lg mb-2" />
            <div className="h-3 w-32 bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-72" />
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-72" />
      </div>
    </div>
  )
}
