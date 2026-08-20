import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Activity, Plus, TrendingUp, Target } from 'lucide-react';
import { clsx } from 'clsx';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/sessions', label: 'Treinos', icon: Activity },
    { to: '/sessions/new', label: 'Gravar', icon: Plus, isAction: true },
    { to: '/progress', label: 'Evolução', icon: TrendingUp },
    { to: '/goals', label: 'Metas', icon: Target },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#08090C]/95 backdrop-blur-lg border-t border-[#1E232E] px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center -mt-6 group"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#39FF14] p-0.5 shadow-[0_0_20px_rgba(0,240,255,0.4)] group-hover:scale-105 active:scale-95 transition-transform flex items-center justify-center">
                  <div className="h-full w-full bg-[#08090C] rounded-full flex items-center justify-center">
                    <Plus className="h-6 w-6 text-[#00F0FF]" />
                  </div>
                </div>
                <span className="text-[10px] font-mono tracking-wider text-[#00F0FF] uppercase mt-1">
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
                  'flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors',
                  isActive
                    ? 'text-[#00F0FF]'
                    : 'text-gray-500 hover:text-gray-300'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-mono uppercase tracking-wider mt-1">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
