import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Bell, X } from 'lucide-react';
import { SPORT_LABELS } from '../../lib/utils';

interface TrainingReminderModalProps {
  onClose: () => void;
}

const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const TrainingReminderModal: React.FC<TrainingReminderModalProps> = ({ onClose }) => {
  const { addReminder, userSports } = useSettings();
  const [weekday, setWeekday] = useState<number>(1);
  const [time, setTime] = useState<string>('07:00');
  const [sportKey, setSportKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addReminder({
        weekday,
        time,
        sportKey: sportKey || undefined,
        enabled: true,
      });
      onClose();
    } catch {
      // toast já disparado pelo context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0D1C2D] border border-[#1F2937] p-6 rounded-xl max-w-md w-full flex flex-col gap-5 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
              Novo Lembrete de Treino
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8F9380] hover:text-[#D4E4FA] text-lg leading-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Dia da Semana */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Dia da Semana
            </label>
            <select
              className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
            >
              {WEEKDAYS.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Horário */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Horário
            </label>
            <input
              type="time"
              required
              className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Modalidade (Opcional) */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Modalidade Específica (Opcional)
            </label>
            <select
              className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={sportKey}
              onChange={(e) => setSportKey(e.target.value)}
            >
              <option value="">Qualquer treino / Geral</option>
              {userSports.map((s) => (
                <option key={s.sportKey} value={s.sportKey}>
                  {s.displayName || SPORT_LABELS[s.sportKey] || s.sportKey}
                </option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              className="flex-1 py-2.5 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-3 bg-[#38BDF8] text-[#051424] hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando…' : 'Salvar Lembrete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
