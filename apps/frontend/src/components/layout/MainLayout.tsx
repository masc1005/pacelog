import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';

import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { House, ListChecks, ChartNoAxesCombined, CircleUserRound, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { SessionCreatorSheet } from '../navigation/SessionCreatorSheet';

const DESKTOP_NAV = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/sessions', label: 'Sessões', icon: ListChecks, end: false },
  { to: '/progress', label: 'Progresso', icon: ChartNoAxesCombined, end: false },
  { to: '/profile', label: 'Perfil', icon: CircleUserRound, end: false },
];

export const MainLayout: React.FC = () => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#08090C] text-white flex flex-col font-sans selection:bg-[#D4F684]/30 selection:text-[#D4F684]">
      <Header onOpenSessionCreator={() => setSheetOpen(true)} />

      {/* Desktop Sub-Nav */}
      <div className="hidden md:block border-b border-[#1E232E]/60 bg-[#0E1117]/50 backdrop-blur-sm px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1" aria-label="Navegação principal">
            {DESKTOP_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium uppercase tracking-wider border-b-2 transition-all',
                      isActive
                        ? 'border-[#D4F684] text-[#D4F684] bg-[#D4F684]/5'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-[#1E232E]'
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Registrar treino"
            className="inline-flex items-center gap-2 bg-[#D4F684] text-[#051424] hover:bg-[#c8f060] px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(212,246,132,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Novo Treino</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da página */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12 animate-fadeIn">
        <Outlet />
      </main>

      <BottomNav />

      <SessionCreatorSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
};
