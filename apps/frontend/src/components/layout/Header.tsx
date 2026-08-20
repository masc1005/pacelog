import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Activity } from 'lucide-react';
import { Badge } from '../ui/Badge';

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
    <header className="sticky top-0 z-40 w-full bg-[#08090C]/80 backdrop-blur-md border-b border-[#1E232E] px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand & Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#39FF14] p-0.5 shadow-[0_0_15px_rgba(0,240,255,0.3)] group-hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] transition-all">
            <div className="h-full w-full bg-[#08090C] rounded-[6px] flex items-center justify-center">
              <Activity className="h-4 w-4 text-[#00F0FF]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-white leading-none">
              PACELOG
            </span>
            <span className="font-mono text-[9px] tracking-widest text-[#00F0FF] uppercase leading-none mt-0.5">
              CHRONO TACTICAL
            </span>
          </div>
        </Link>

        {/* Status indicator & User Menu */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex">
            <Badge variant="green" size="sm" pulse>
              SYNC ONLINE
            </Badge>
          </div>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#1E232E]">
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#141822] text-gray-300 hover:text-white transition-colors"
                title="Meu Perfil"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#00F0FF]/20 to-[#39FF14]/20 border border-[#00F0FF]/40 flex items-center justify-center text-xs font-mono font-bold text-[#00F0FF]">
                  {getInitials(user.name)}
                </div>
                <span className="hidden md:inline-block text-xs font-sans font-medium text-gray-200">
                  {user.name.split(' ')[0]}
                </span>
              </Link>

              <button
                onClick={() => signOut()}
                className="p-1.5 text-gray-400 hover:text-[#FF3366] hover:bg-[#FF3366]/10 rounded-lg transition-colors cursor-pointer"
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
