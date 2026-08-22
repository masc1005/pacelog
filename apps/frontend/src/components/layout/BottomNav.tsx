import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Activity, Plus, TrendingUp, Target, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/sessions', label: 'Diário', icon: Activity },
    { to: '/sessions/new', label: 'Gravar', icon: Plus, isAction: true },
    { to: '/progress', label: 'Evolução', icon: TrendingUp },
    { to: '/goals', label: 'Metas', icon: Target },
    { to: '/insights', label: 'Coach', icon: Sparkles },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#051424] border-t border-[#1F2937] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors',
                  isActive
                    ? item.isAction ? 'text-[#FF6B35] bg-[#FF6B35]/10' : 'text-[#D4F684] bg-[#D4F684]/10'
                    : 'text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24]'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-mono uppercase tracking-wider">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
