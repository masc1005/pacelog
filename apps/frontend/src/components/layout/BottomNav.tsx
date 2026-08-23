import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { House, ListChecks, ChartNoAxesCombined, CircleUserRound, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { SessionCreatorSheet } from '../navigation/SessionCreatorSheet';

// Destinos com regras de ativação por prefixo de pathname
const NAV_DESTINATIONS = [
  {
    key: 'home',
    label: 'Início',
    href: '/',
    icon: House,
    exact: true, // só ativa em "/"
  },
  {
    key: 'sessions',
    label: 'Sessões',
    href: '/sessions',
    icon: ListChecks,
    exact: false,
  },
  {
    key: 'progress',
    label: 'Progresso',
    href: '/progress',
    icon: ChartNoAxesCombined,
    exact: false,
  },
  {
    key: 'profile',
    label: 'Perfil',
    href: '/profile',
    icon: CircleUserRound,
    exact: false,
  },
];

export const BottomNav: React.FC = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  // Divide em dois lados: [Início, Sessões] + [+] + [Progresso, Perfil]
  const leftItems = NAV_DESTINATIONS.slice(0, 2);
  const rightItems = NAV_DESTINATIONS.slice(2);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#051424]/95 backdrop-blur-md border-t border-[#1F2937] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-stretch justify-between px-1 pt-1">
          {/* Lado esquerdo */}
          {leftItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <NavLink
                key={item.key}
                to={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all',
                  active
                    ? 'text-[#D4F684]'
                    : 'text-[#8F9380] hover:text-[#D4E4FA]'
                )}
              >
                <Icon
                  className={clsx(
                    'h-5 w-5 transition-transform',
                    active && 'scale-110'
                  )}
                  aria-hidden="true"
                />
                <span className="text-[9px] font-mono uppercase tracking-wider">
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] w-4 h-0.5 rounded-full bg-[#D4F684]" />
                )}
              </NavLink>
            );
          })}

          {/* Botão + central */}
          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Registrar treino"
              aria-haspopup="dialog"
              className={clsx(
                'relative -top-3 flex items-center justify-center',
                'w-14 h-14 rounded-full',
                'bg-[#D4F684] text-[#051424]',
                'shadow-[0_4px_20px_rgba(212,246,132,0.35)]',
                'hover:bg-[#c8f060] hover:shadow-[0_4px_28px_rgba(212,246,132,0.5)]',
                'active:scale-95 transition-all duration-150'
              )}
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          {/* Lado direito */}
          {rightItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <NavLink
                key={item.key}
                to={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all',
                  active
                    ? 'text-[#D4F684]'
                    : 'text-[#8F9380] hover:text-[#D4E4FA]'
                )}
              >
                <Icon
                  className={clsx(
                    'h-5 w-5 transition-transform',
                    active && 'scale-110'
                  )}
                  aria-hidden="true"
                />
                <span className="text-[9px] font-mono uppercase tracking-wider">
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] w-4 h-0.5 rounded-full bg-[#D4F684]" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <SessionCreatorSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};
