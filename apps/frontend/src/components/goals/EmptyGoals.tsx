import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Target, FilterX, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmptyGoalsProps {
  variant: 'no-goals' | 'no-results';
  onResetFilters?: () => void;
}

export const EmptyGoals: React.FC<EmptyGoalsProps> = ({ variant, onResetFilters }) => {
  const navigate = useNavigate();

  if (variant === 'no-results') {
    return (
      <Card className="p-12 flex flex-col items-center justify-center gap-3 border-dashed border-[#1F2937] bg-[#0D1C2D]/50 text-center">
        <div className="w-12 h-12 rounded-full bg-[#161C24] flex items-center justify-center text-[#8F9380] border border-[#1F2937]">
          <FilterX className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm text-[#D4E4FA] uppercase font-bold">
            Nenhuma meta encontrada
          </span>
          <p className="font-mono text-xs text-[#8F9380]">
            Não há metas cadastradas para os filtros selecionados.
          </p>
        </div>
        {onResetFilters && (
          <Button variant="secondary" size="sm" onClick={onResetFilters} className="mt-2 text-xs">
            Limpar Filtros
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-12 flex flex-col items-center justify-center gap-4 border-dashed border-[#1F2937] bg-[#0D1C2D]/50 text-center">
      <div className="w-14 h-14 rounded-full bg-[#D4F684]/10 border border-[#D4F684]/30 flex items-center justify-center text-[#D4F684]">
        <Target className="w-7 h-7" />
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <span className="font-display text-base font-bold text-[#D4E4FA] uppercase">
          Nenhuma meta ativa
        </span>
        <p className="font-mono text-xs text-[#8F9380]">
          Defina seu primeiro alvo tático — como volume semanal de corrida, meta de rounds ou consistência.
        </p>
      </div>
      <Button
        variant="tactile"
        size="sm"
        onClick={() => navigate('/goals/new')}
        leftIcon={<Plus className="w-4 h-4" />}
        className="mt-1 font-mono text-xs uppercase tracking-wider"
      >
        Definir Primeira Meta
      </Button>
    </Card>
  );
};
