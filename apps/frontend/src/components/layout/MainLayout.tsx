import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Home, Activity, Plus, TrendingUp, Target, User, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export const MainLayout: React.FC = () => {
  const desktopNavItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/sessions', label: 'Histórico de Treinos', icon: Activity },
    { to: '/progress', label: 'Evolução & Métricas', icon: TrendingUp },
    { to: '/goals', label: 'Metas Ativas', icon: Target },
    { to: '/insights', label: 'Inteligência', icon: Sparkles },
    { to: '/profile', label: 'Perfil do Atleta', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col font-sans selection:bg-[#00F0FF]/30 selection:text-[#00F0FF]">
      <Header />

      {/* Desktop Sub-Nav Header */}
      <div className="hidden md:block border-b border-[#1E232E]/60 bg-[#0E1117]/50 backdrop-blur-sm px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono font-medium uppercase tracking-wider border-b-2 transition-all',
                      isActive
                        ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/5'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-[#1E232E]'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <NavLink
            to="/sessions/new"
            className="inline-flex items-center gap-2 bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Treino</span>
          </NavLink>
        </div>
      </div>

      {/* Main Page Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12 animate-fadeIn">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
};
