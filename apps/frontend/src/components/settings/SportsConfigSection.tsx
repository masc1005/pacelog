import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { useSettings } from '../../hooks/useSettings';
import { AddCustomSportModal } from './AddCustomSportModal';
import { SportMetricsConfigModal } from './SportMetricsConfigModal';
import { Plus, Sliders, Activity, Flame, Sun, Zap, Dumbbell, Waves, Bike, Shield, Trophy } from 'lucide-react';
import type { UserSportDTO } from '@pacelog/shared';

const ICON_MAP: Record<string, any> = {
  Activity,
  Flame,
  Sun,
  Zap,
  Dumbbell,
  Waves,
  Bike,
  Shield,
  Trophy,
};

export const SportsConfigSection: React.FC = () => {
  const { userSports, updateSport } = useSettings();
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [selectedSportToConfig, setSelectedSportToConfig] = useState<UserSportDTO | null>(null);

  const handleToggleSport = async (sport: UserSportDTO) => {
    try {
      await updateSport(sport.sportKey, { isActive: !sport.isActive });
    } catch {
      // toast disparado pelo context
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
            Esportes e Métricas
          </h2>
          <p className="font-mono text-xs text-[#8F9380] mt-0.5">
            Gerencie as modalidades ativas no seletor de treinos e personalize os campos coletados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddCustomModal(true)}
          className="flex items-center gap-1.5 py-2 px-3 bg-[#D4F684] text-[#051424] font-mono text-xs uppercase font-bold tracking-wider rounded-lg shadow-[0_0_15px_rgba(212,246,132,0.3)] hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar Esporte
        </button>
      </div>

      {/* Grid de Esportes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {userSports.map((sport) => {
          const IconComponent = ICON_MAP[sport.icon] || Activity;
          return (
            <Card
              key={sport.sportKey}
              className={`p-4 bg-[#0D1C2D] border transition-all flex items-center justify-between gap-3 ${
                sport.isActive ? 'border-[#1F2937]' : 'border-[#1F2937]/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border flex items-center justify-center"
                  style={{
                    backgroundColor: `${sport.color}15`,
                    borderColor: `${sport.color}40`,
                    color: sport.color,
                  }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                      {sport.displayName}
                    </span>
                    {sport.isCustom && (
                      <span className="font-mono text-[9px] bg-[#161C24] text-[#D4F684] px-1.5 py-0.5 rounded border border-[#1F2937]">
                        Custom
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[#8F9380]">
                    {sport.metricsConfig?.filter((m) => m.visible).length || 0} métricas ativas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão de Configurar Métricas */}
                <button
                  type="button"
                  onClick={() => setSelectedSportToConfig(sport)}
                  className="p-2 text-[#8F9380] hover:text-[#D4E4FA] bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg transition-colors"
                  title="Configurar campos e métricas"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {/* Toggle Ativo/Inativo */}
                <button
                  type="button"
                  onClick={() => handleToggleSport(sport)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    sport.isActive ? 'bg-[#D4F684]' : 'bg-[#161C24] border border-[#1F2937]'
                  }`}
                  aria-label={`Alternar esporte ${sport.displayName}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-[#051424] transition-transform ${
                      sport.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {showAddCustomModal && (
        <AddCustomSportModal onClose={() => setShowAddCustomModal(false)} />
      )}

      {selectedSportToConfig && (
        <SportMetricsConfigModal
          sport={selectedSportToConfig}
          onClose={() => setSelectedSportToConfig(null)}
        />
      )}
    </div>
  );
};
