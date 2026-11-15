import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { apiClient } from '../../lib/api';

export type MuscleFatigueRegion = {
  region: string;
  fatigueScore: number;
  recoveryPercent: number;
  status: 'fresh' | 'recovering' | 'fatigued';
  sources: string[];
};

type Props = {
  compact?: boolean;
  className?: string;
};

const statusColor = {
  fresh: '#D4F684',
  recovering: '#FFB800',
  fatigued: '#FF6B35',
} as const;

const labels: Record<string, string> = {
  quadriceps: 'Quadríceps',
  posteriores: 'Posterior',
  panturrilhas: 'Panturrilhas',
  joelhos: 'Joelhos',
  ombros: 'Ombros',
  costas: 'Costas',
  lombar: 'Lombar',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebracos: 'Antebraços',
  pegada: 'Pegada',
  core: 'Core',
  abdomen: 'Abdômen',
  gluteos: 'Glúteos',
  peito: 'Peito',
  corpo_inteiro: 'Corpo inteiro',
};

export const MuscleFatigueTelemetry: React.FC<Props> = ({ compact = false, className = '' }) => {
  const [regions, setRegions] = useState<MuscleFatigueRegion[]>([]);

  useEffect(() => {
    apiClient<{ regions: MuscleFatigueRegion[] }>('/api/progress/muscle-fatigue')
      .then((data) => setRegions(data.regions ?? []))
      .catch(() => setRegions([]));
  }, []);

  if (regions.length === 0) return null;

  return (
    <section className={`rounded border border-[#1F2937] bg-[#0D1C2D] ${compact ? 'p-3' : 'p-5'} ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#5CA9E6]" />
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#D4E4FA]">
            Mapa de fadiga muscular
          </h2>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#8F9380]">
          % Recuperação (72h)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {regions.map((region) => (
          <div key={region.region} className="rounded bg-[#161C24] p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10px] text-[#C5C8B4]">
                {labels[region.region] ?? region.region}
              </span>
              <span
                className="shrink-0 font-mono text-[10px]"
                style={{ color: statusColor[region.status] }}
                title={`${region.recoveryPercent}% recuperado (fadiga: ${region.fatigueScore}%)`}
              >
                {region.recoveryPercent}% recup.
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-[#1F2937]">
              <div
                className="h-full rounded"
                style={{
                  width: `${region.recoveryPercent}%`,
                  backgroundColor: statusColor[region.status],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
