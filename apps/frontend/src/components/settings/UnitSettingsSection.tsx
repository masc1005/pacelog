import React from 'react';
import { Card } from '../ui/Card';
import { useSettings } from '../../hooks/useSettings';
import { Ruler, Scale, Clock, Globe, Eye } from 'lucide-react';
import type { DistanceUnit, WeightUnit, TimeFormat } from '@pacelog/shared';

const TIMEZONES = [
  { value: 'America/Bahia', label: 'Brasília / Salvador (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo / Rio de Janeiro (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco / Acre (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'Europe/Lisbon', label: 'Lisboa / Porto (GMT+0 / GMT+1)' },
  { value: 'Europe/Madrid', label: 'Madri (GMT+1 / GMT+2)' },
  { value: 'America/New_York', label: 'Nova York / Miami (ET)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles / Califórnia (PT)' },
  { value: 'UTC', label: 'UTC (Tempo Universal Coordenado)' },
];

export const UnitSettingsSection: React.FC = () => {
  const { settings, updateSettings, formatDistance, formatWeight, formatSpeed } = useSettings();

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Unidades e Fuso Horário
        </h2>
        <p className="font-mono text-xs text-[#8F9380] mt-0.5">
          Configure as unidades de exibição para todas as telemetrias do app.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unidade de Distância */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#D4E4FA]">
            <Ruler className="w-4 h-4 text-[#38BDF8]" />
            <span className="font-mono text-xs uppercase font-bold tracking-wider">
              Distância
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">Afeta corrida, ciclismo e natação.</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(['km', 'mi'] as DistanceUnit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => updateSettings({ distanceUnit: unit })}
                className={`py-2.5 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                  settings.distanceUnit === unit
                    ? 'bg-[#38BDF8] text-[#051424] shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                    : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA]'
                }`}
              >
                {unit === 'km' ? 'Quilômetros (km)' : 'Milhas (mi)'}
              </button>
            ))}
          </div>
        </Card>

        {/* Unidade de Peso */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#D4E4FA]">
            <Scale className="w-4 h-4 text-[#A855F7]" />
            <span className="font-mono text-xs uppercase font-bold tracking-wider">
              Carga e Peso
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">Afeta musculação e peso corporal.</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(['kg', 'lb'] as WeightUnit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => updateSettings({ weightUnit: unit })}
                className={`py-2.5 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                  settings.weightUnit === unit
                    ? 'bg-[#A855F7] text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA]'
                }`}
              >
                {unit === 'kg' ? 'Quilos (kg)' : 'Libras (lb)'}
              </button>
            ))}
          </div>
        </Card>

        {/* Formato de Hora */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#D4E4FA]">
            <Clock className="w-4 h-4 text-[#D4F684]" />
            <span className="font-mono text-xs uppercase font-bold tracking-wider">
              Formato de Horário
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">Exibição de hora nos treinos e histórico.</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(['24h', '12h'] as TimeFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => updateSettings({ timeFormat: fmt })}
                className={`py-2.5 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                  settings.timeFormat === fmt
                    ? 'bg-[#D4F684] text-[#051424] shadow-[0_0_15px_rgba(212,246,132,0.3)]'
                    : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA]'
                }`}
              >
                {fmt === '24h' ? '24 Horas (22:30)' : '12 Horas (10:30 PM)'}
              </button>
            ))}
          </div>
        </Card>

        {/* Fuso Horário */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#D4E4FA]">
            <Globe className="w-4 h-4 text-[#FFB800]" />
            <span className="font-mono text-xs uppercase font-bold tracking-wider">
              Fuso Horário
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">Cálculo de sequências (streak) e relatórios diários.</p>
          <select
            className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded outline-none focus:border-[#D4F684]"
            value={settings.timezone}
            onChange={(e) => updateSettings({ timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </Card>
      </div>

      {/* Card de Preview em Tempo Real */}
      <Card className="p-5 bg-[#161C24] border border-[#1F2937] rounded-xl flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#8F9380]">
          <Eye className="w-4 h-4 text-[#D4F684]" />
          <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#C5C8B4]">
            Pré-visualização da Telemetria com suas Preferências
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="flex flex-col bg-[#0D1C2D] p-3 rounded border border-[#1F2937]">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase">Distância</span>
            <span className="font-display text-base font-bold text-[#38BDF8]">
              {formatDistance(10)}
            </span>
          </div>
          <div className="flex flex-col bg-[#0D1C2D] p-3 rounded border border-[#1F2937]">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase">Velocidade</span>
            <span className="font-display text-base font-bold text-[#10B981]">
              {formatSpeed(24.5)}
            </span>
          </div>
          <div className="flex flex-col bg-[#0D1C2D] p-3 rounded border border-[#1F2937]">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase">Carga Total</span>
            <span className="font-display text-base font-bold text-[#A855F7]">
              {formatWeight(80)}
            </span>
          </div>
          <div className="flex flex-col bg-[#0D1C2D] p-3 rounded border border-[#1F2937]">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase">Horário</span>
            <span className="font-display text-base font-bold text-[#D4F684]">
              {settings.timeFormat === '12h' ? '08:30 PM' : '20:30'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
