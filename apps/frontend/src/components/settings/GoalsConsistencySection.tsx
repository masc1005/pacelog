import React from 'react';
import { Card } from '../ui/Card';
import { useSettings } from '../../hooks/useSettings';
import { Target, Flame, Newspaper } from 'lucide-react';

export const GoalsConsistencySection: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  const weeklyMinutes = settings.weeklyVolumeGoalMinutes ?? 240;
  const weeklyHours = (weeklyMinutes / 60).toFixed(1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Metas e Consistência
        </h2>
        <p className="font-mono text-xs text-[#8F9380] mt-0.5">
          Defina parâmetros de volume semanal padrão e regras de tolerância de sequências (streak).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta Semanal de Volume */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#D4E4FA]">
              <Target className="w-4 h-4 text-[#D4F684]" />
              <span className="font-mono text-xs uppercase font-bold tracking-wider">
                Volume Semanal Alvo
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-[#D4F684]">
              {weeklyMinutes} min ({weeklyHours}h)
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">
            Volume de treino sugerido como referência padrão no dashboard.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min="60"
              max="1200"
              step="30"
              value={weeklyMinutes}
              onChange={(e) =>
                updateSettings({ weeklyVolumeGoalMinutes: Number(e.target.value) })
              }
              className="w-full accent-[#D4F684] h-2 bg-[#161C24] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between font-mono text-[9px] text-[#8F9380]">
              <span>1h (60 min)</span>
              <span>10h (600 min)</span>
              <span>20h (1200 min)</span>
            </div>
          </div>
        </Card>

        {/* Tolerância da Sequência (Streak Grace Days) */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#D4E4FA]">
              <Flame className="w-4 h-4 text-[#FF6B35]" />
              <span className="font-mono text-xs uppercase font-bold tracking-wider">
                Tolerância de Sequência
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-[#FF6B35]">
              {settings.streakGraceDays} {settings.streakGraceDays === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">
            Dias consecutivos de descanso permitidos sem que a sequência (streak) seja zerada.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => updateSettings({ streakGraceDays: days })}
                className={`py-2 rounded text-xs font-mono font-bold uppercase transition-all ${
                  settings.streakGraceDays === days
                    ? 'bg-[#FF6B35] text-white shadow-[0_0_15px_rgba(255,107,53,0.3)]'
                    : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA]'
                }`}
              >
                {days === 0 ? 'Rígido (0d)' : `${days}d`}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Resumo Semanal (Weekly Digest) */}
      <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#161C24] border border-[#1F2937] flex items-center justify-center text-[#38BDF8]">
            <Newspaper className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wide">
              Resumo Semanal de Telemetria (Digest)
            </span>
            <span className="text-xs text-[#8F9380]">
              Compilação semanal com métricas ACWR, total de carga e recordes batidos.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateSettings({ weeklyDigestEnabled: !settings.weeklyDigestEnabled })}
          className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
            settings.weeklyDigestEnabled ? 'bg-[#38BDF8]' : 'bg-[#161C24] border border-[#1F2937]'
          }`}
          aria-label="Alternar Resumo Semanal"
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              settings.weeklyDigestEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </Card>
    </div>
  );
};
