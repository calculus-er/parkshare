export default function GlobalLoadingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
        <p className="text-white/40 text-xs tracking-wider uppercase">ParkShare Loading...</p>
      </div>
    </main>
  );
}
