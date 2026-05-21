export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <div>
        <div className="h-7 w-36 bg-slate-800 rounded-xl mb-2" />
        <div className="h-3 w-52 bg-slate-800 rounded-full" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-slate-800" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-slate-800 rounded-lg" />
            <div className="h-3 w-28 bg-slate-800 rounded-full" />
          </div>
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 bg-slate-800 rounded-full" />
            <div className="h-10 bg-slate-800 rounded-xl" />
          </div>
        ))}
        <div className="h-10 w-32 bg-slate-800 rounded-xl" />
      </div>
    </div>
  )
}
