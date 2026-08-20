export function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-mono">
      <div className="border border-[#232730] bg-[#15181e] p-8 rounded-xl max-w-md w-full shadow-2xl">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#39ff14] bg-[#39ff14]/10 border border-[#39ff14]/30 rounded-full mb-4">
          SYSTEM ACTIVE
        </span>
        <h1 className="text-3xl font-bold font-sans tracking-tight mb-2">PACELOG</h1>
        <p className="text-sm text-gray-400 mb-6">Precision Chronograph & Multi-Sport Tactical Tracker</p>
        <div className="text-xs text-gray-500 border-t border-[#232730] pt-4">
          Monorepo Core Foundation • Vite 6 + React 19 + Tailwind v4
        </div>
      </div>
    </main>
  );
}

export default App;
