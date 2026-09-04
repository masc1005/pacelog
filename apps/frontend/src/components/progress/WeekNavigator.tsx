import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface WeekNavigatorProps {
  weekOffset: number;
  periodLabel?: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetWeek?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  weekOffset,
  periodLabel,
  onPrevWeek,
  onNextWeek,
  onResetWeek,
  isLoading = false,
  className = '',
}) => {
  const isCurrentWeek = weekOffset === 0;

  const weekDescription = isCurrentWeek
    ? 'Esta semana'
    : weekOffset === -1
      ? 'Semana passada'
      : `${Math.abs(weekOffset)} semanas atrás`;

  return (
    <div className={`flex items-center justify-between gap-3 bg-[#0B1521] border border-[#1F2937] rounded-xl px-3.5 py-2 ${className}`}>
      {/* Botão Anterior */}
      <button
        type="button"
        onClick={onPrevWeek}
        disabled={isLoading}
        aria-label="Semana anterior"
        className="p-1.5 rounded-lg bg-[#0D1C2D] border border-[#1F2937] text-[#D4E4FA] hover:text-[#5CA9E6] hover:border-[#5CA9E6]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Label Central */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1.5">
          {isCurrentWeek && <span className="w-1.5 h-1.5 rounded-full bg-[#D4F684] animate-pulse" />}
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#D4E4FA]">
            {weekDescription}
          </span>
        </div>
        {periodLabel && (
          <span className="font-mono text-[11px] text-[#8F9380] mt-0.5">
            {periodLabel}
          </span>
        )}
      </div>

      {/* Botões Direita (Próxima / Reset) */}
      <div className="flex items-center gap-1.5">
        {!isCurrentWeek && onResetWeek && (
          <button
            type="button"
            onClick={onResetWeek}
            disabled={isLoading}
            title="Voltar para a semana atual"
            className="p-1.5 rounded-lg bg-[#0D1C2D] border border-[#1F2937] text-[#8F9380] hover:text-[#D4F684] hover:border-[#D4F684]/50 transition-all cursor-pointer flex items-center justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onNextWeek}
          disabled={isCurrentWeek || isLoading}
          aria-label="Próxima semana"
          className="p-1.5 rounded-lg bg-[#0D1C2D] border border-[#1F2937] text-[#D4E4FA] hover:text-[#5CA9E6] hover:border-[#5CA9E6]/50 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
