export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-royal-500/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-royal-500 animate-spin" />
        </div>
        <p className="text-sm text-slate-400">Carregando…</p>
      </div>
    </div>
  );
}
