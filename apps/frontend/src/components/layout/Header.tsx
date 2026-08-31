import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Gauge, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface HeaderProps {
  onOpenSessionCreator?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (name?: string) => {
    if (!name) return 'AT';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B1117]/90 backdrop-blur-md border-b border-[#1F2937] px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-8 w-8 rounded-[2px] bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#D4F684] group-hover:border-[#D4F684]/50 transition-colors">
            <Gauge className="h-4 w-4" aria-hidden="true" />
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

        {/* Status + Avatar */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border border-[#1F2937] px-3 py-1 rounded-[2px] bg-[#0D1C2D]">
            <span className="w-2 h-2 rounded-full bg-[#5CA9E6] animate-pulse" />
            <span className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest">
              SYNC ACTIVE
            </span>
          </div>

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                aria-label="Menu da conta"
                className="flex items-center gap-1.5 p-1 rounded-[2px] hover:bg-[#161C24] transition-colors border border-transparent hover:border-[#1F2937]"
              >
                <div className="h-7 w-7 rounded-[2px] bg-[#161C24] border border-[#D4F684]/40 flex items-center justify-center text-xs font-mono font-bold text-[#D4F684]">
                  {getInitials(user.name)}
                </div>
                <span className="hidden md:inline-block text-xs font-mono text-[#D4E4FA]">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown
                  className={clsx(
                    'h-3.5 w-3.5 text-[#8F9380] transition-transform duration-200',
                    dropdownOpen && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div
                  role="menu"
                  aria-label="Opções da conta"
                  className="absolute right-0 top-full mt-2 w-48 bg-[#0D1C2D] border border-[#1F2937] rounded-lg shadow-xl z-50 overflow-hidden"
                >
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-mono text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
                  >
                    <User className="h-4 w-4 text-[#8F9380]" aria-hidden="true" />
                    Ver perfil
                  </Link>
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-mono text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
                  >
                    <Settings className="h-4 w-4 text-[#8F9380]" aria-hidden="true" />
                    Configurações
                  </Link>
                  <div className="border-t border-[#1F2937]" />
                  <button
                    role="menuitem"
                    onClick={() => { setDropdownOpen(false); signOut(); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-mono text-[#FFB4AB] hover:bg-[#1a0a0a] transition-colors"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
