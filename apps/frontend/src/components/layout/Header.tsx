import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Gauge } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'AT';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B1117]/90 backdrop-blur-md border-b border-[#1F2937] px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand & Logo matching Stitch TopAppBar */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-8 w-8 rounded-[2px] bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#D4F684] group-hover:border-[#D4F684]/50 transition-colors">
            <Gauge className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-[#D4E4FA] leading-none lowercase">
              pacelog
            </span>
            <span className="font-mono text-[9px] tracking-widest text-[#8F9380] uppercase leading-none mt-0.5">
              PRECISION TELEMETRY
            </span>
          </div>
        </Link>

        {/* Status Indicator (Watch style from Stitch) & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border border-[#1F2937] px-3 py-1 rounded-[2px] bg-[#0D1C2D]">
            <span className="w-2 h-2 rounded-full bg-[#5CA9E6] animate-pulse"></span>
            <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">
              SYNC ACTIVE
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#1F2937]">
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1 rounded-[2px] hover:bg-[#161C24] text-[#D4E4FA] transition-colors"
                title="Meu Perfil"
              >
                <div className="h-7 w-7 rounded-[2px] bg-[#161C24] border border-[#D4F684]/40 flex items-center justify-center text-xs font-mono font-bold text-[#D4F684]">
                  {getInitials(user.name)}
                </div>
                <span className="hidden md:inline-block text-xs font-mono text-[#D4E4FA]">
                  {user.name.split(' ')[0]}
                </span>
              </Link>

              <button
                onClick={() => signOut()}
                className="p-1.5 text-[#8F9380] hover:text-[#FFB4AB] hover:bg-[#161C24] rounded-[2px] transition-colors cursor-pointer"
                title="Encerrar Sessão"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
