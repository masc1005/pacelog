import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Activity, Plus, TrendingUp, Target } from 'lucide-react';
import { clsx } from 'clsx';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/sessions', label: 'Diário', icon: Activity },
    { to: '/sessions/new', label: 'Gravar', icon: Plus, isAction: true },
    { to: '/progress', label: 'Evolução', icon: TrendingUp },
    { to: '/goals', label: 'Metas', icon: Target },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#051424]/95 backdrop-blur-lg border-t border-[#1F2937] px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div className="h-11 w-11 rounded-[2px] btn-tactile shadow-[0_0_20px_rgba(255,107,53,0.35)] group-hover:scale-105 active:scale-95 transition-transform flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-[#FF6B35] uppercase mt-1">
                  {item.label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center p-1 rounded-[2px] transition-colors',
                  isActive
                    ? 'text-[#D4F684]'
                    : 'text-[#8F9380] hover:text-[#D4E4FA]'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-mono uppercase tracking-wider mt-0.5">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
