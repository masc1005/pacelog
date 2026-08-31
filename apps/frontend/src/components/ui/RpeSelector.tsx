import React from 'react';

export const RPE_LABELS: Record<number, string> = {
  1: '1 · Muito Leve / Recuperação',
  2: '2 · Leve / Fácil',
  3: '3 · Moderado / Confortável',
  4: '4 · Relativamente Difícil',
  5: '5 · Difícil / Ritmo Firme',
  6: '6 · Intenso',
  7: '7 · Muito Difícil (2-3 reps na reserva)',
  8: '8 · Pesado (1-2 reps na reserva)',
  9: '9 · Extremo (Limite da falha)',
  10: '10 · Exaustão Máxima / Falha Total',
};

export function getRpeColor(val: number): string {
  if (val <= 4) return '#39FF14';
  if (val <= 6) return '#FFB800';
  if (val <= 8) return '#FF6B35';
  return '#FF3366';
}

interface RpeSelectorProps {
  rpe: number;
  onChangeRpe: (rpe: number) => void;
  durationMinutes: number;
  notes: string;
  onChangeNotes: (notes: string) => void;
  notesPlaceholder?: string;
}

export const RpeSelector: React.FC<RpeSelectorProps> = ({
  rpe,
  onChangeRpe,
  durationMinutes,
  notes,
  onChangeNotes,
  notesPlaceholder = 'Como sentiu o treino? Sensações, dor articular, ajustes ou observações táticas...',
}) => {
  const estimatedSrpe = rpe * Math.max(1, durationMinutes);
  const currentColor = getRpeColor(rpe);

  return (
    <div className="flex flex-col gap-6">
      {/* Percepção Subjetiva de Esforço (RPE) */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
            Esforço Percebido (RPE)
          </label>
          <span
            className="font-display text-2xl font-bold transition-colors"
            style={{ color: currentColor }}
          >
            {rpe} / 10
          </span>
        </div>

        {/* Rótulo descritivo da Escala Borg */}
        <div
          className="p-3 rounded-lg border font-mono text-xs font-semibold text-center transition-all"
          style={{
            backgroundColor: `${currentColor}15`,
            borderColor: `${currentColor}40`,
            color: currentColor,
          }}
        >
          {RPE_LABELS[rpe] || `${rpe} / 10`}
        </div>

        {/* Slider interativo */}
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={rpe}
          onChange={(e) => onChangeRpe(Number(e.target.value))}
          className="w-full h-2.5 bg-[#161C24] rounded-lg cursor-pointer transition-all"
          style={{ accentColor: currentColor }}
        />

        {/* Botões numéricos rápidos 1-10 */}
        <div className="grid grid-cols-10 gap-1.5 mt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
            const isSelected = rpe === num;
            const btnColor = getRpeColor(num);
            return (
              <button
                key={num}
                type="button"
                onClick={() => onChangeRpe(num)}
                className={`py-2 rounded-[4px] text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? 'text-[#051424] font-black shadow-lg scale-105'
                    : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: btnColor,
                        boxShadow: `0 0 14px ${btnColor}60`,
                      }
                    : undefined
                }
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Card de Carga Sessional Calculada (Foster TRIMP) */}
        <div className="p-3.5 bg-[#161C24] border border-[#1F2937] rounded-lg flex items-center justify-between mt-1">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#C5C8B4] uppercase">
              Carga Sessional Prevista
            </span>
            <span className="font-mono text-[9px] text-[#8F9380]">
              Foster TRIMP ({durationMinutes} min × RPE {rpe})
            </span>
          </div>
          <span className="font-mono text-base font-bold text-[#D4F684]">
            {estimatedSrpe} AU
          </span>
        </div>
      </div>

      {/* Notas Táticas / Observações */}
      <div className="flex flex-col gap-2">
        <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
          Notas do Treino (Opcional)
        </label>
        <textarea
          className="w-full input-precision min-h-[85px] p-3 text-xs rounded-lg border border-[#1F2937] bg-[#161C24] text-[#D4E4FA] placeholder-[#8F9380] focus:border-[#D4F684] outline-none resize-y"
          placeholder={notesPlaceholder}
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
        />
      </div>
    </div>
  );
};
