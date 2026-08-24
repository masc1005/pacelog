import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Activity, Flame, Sun, Zap, Dumbbell, Waves } from 'lucide-react';
import { clsx } from 'clsx';
import type { SportKey } from '@pacelog/shared';

interface Sport {
  key: SportKey;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const SPORTS: Sport[] = [
  {
    key: 'running',
    name: 'Corrida',
    description: 'Treino de rua, pista ou trilha',
    icon: Activity,
    color: '#5CA9E6',
  },
  {
    key: 'football',
    name: 'Futebol',
    description: 'Jogo, treino técnico ou físico',
    icon: Flame,
    color: '#D4F684',
  },
  {
    key: 'futevolei',
    name: 'Futevôlei',
    description: 'Sets, pontos e intensidade',
    icon: Sun,
    color: '#FFB800',
  },
  {
    key: 'boxing',
    name: 'Boxe',
    description: 'Rounds, sparring ou saco',
    icon: Zap,
    color: '#FF6B35',
  },
  {
    key: 'strength',
    name: 'Musculação',
    description: 'Volume, séries e carga',
    icon: Dumbbell,
    color: '#A855F7',
  },
  {
    key: 'swimming',
    name: 'Natação',
    description: 'Treino em piscina, pace e distância',
    icon: Waves,
    color: '#38BDF8',
  },
];

interface SessionCreatorSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionCreatorSheet: React.FC<SessionCreatorSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Arrastar para fechar
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    currentYRef.current = e.touches[0].clientY;
    if (sheetRef.current && startYRef.current !== null) {
      const delta = currentYRef.current - startYRef.current;
      if (delta > 0) {
        sheetRef.current.style.transform = `translateY(${delta}px)`;
      }
    }
  };
  const handleTouchEnd = () => {
    if (
      startYRef.current !== null &&
      currentYRef.current !== null &&
      currentYRef.current - startYRef.current > 80
    ) {
      onClose();
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startYRef.current = null;
    currentYRef.current = null;
  };

  const handleSelectSport = (sportKey: SportKey) => {
    onClose();
    navigate('/sessions/new', { state: { sportKey } });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Selecionar esporte"
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-50 bg-[#0B1117] border-t border-[#1F2937] rounded-t-2xl transition-transform duration-300 ease-out',
          'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#1F2937]" />
        </div>

        {/* Header do sheet */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1F2937]">
          <div>
            <h2 className="font-mono text-sm font-bold text-[#D4E4FA] uppercase tracking-widest">
              O que você treinou?
            </h2>
            <p className="font-mono text-[10px] text-[#8F9380] mt-0.5 uppercase">
              Selecione o esporte para registrar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de esportes */}
        <div className="flex flex-col gap-1 px-4 py-3">
          {SPORTS.map((sport) => {
            const Icon = sport.icon;
            return (
              <button
                key={sport.key}
                onClick={() => handleSelectSport(sport.key)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-[#161C24] active:bg-[#1F2937] transition-colors text-left group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${sport.color}18` }}
                >
                  <Icon className="h-5 w-5" style={{ color: sport.color }} />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-bold text-[#D4E4FA] uppercase tracking-wide group-hover:text-white">
                    {sport.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#8F9380] mt-0.5">
                    {sport.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
