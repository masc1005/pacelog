import React from 'react';
import { Card } from '../ui/Card';
import { ChevronRight, Wrench } from 'lucide-react';
import type { Gear } from '@pacelog/shared';
import { getGearUsage, GEAR_USAGE_UNIT_LABEL } from '@pacelog/shared';
import { useNavigate } from 'react-router-dom';
import { GEAR_VISUAL_META } from './gearMeta';
import { GearUsageBar } from './GearUsageBar';

interface GearUsageSummaryProps {
  gearList?: Gear[];
  activeGearCount?: number;
  /** Legado */
  defaultShoe?: any;
  activeShoesCount?: number;
}

export const GearUsageSummary: React.FC<GearUsageSummaryProps> = ({
  gearList = [],
  activeGearCount,
  defaultShoe,
  activeShoesCount,
}) => {
  const navigate = useNavigate();

  // Compatibilidade com props legadas
  const items: Gear[] =
    gearList.length > 0
      ? gearList
      : defaultShoe
      ? ([defaultShoe] as Gear[])
      : [];

  const activeCount =
    activeGearCount !== undefined
      ? activeGearCount
      : activeShoesCount !== undefined
      ? activeShoesCount
      : items.filter((g) => g.status === 'active').length;

  // Destaques: itens ativos padrão ou os mais usados (até 3)
  const activeItems = items.filter((g) => g.status === 'active');
  const featured = activeItems
    .slice()
    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
    .slice(0, 3);

  return (
    <Card
      className="p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3 cursor-pointer hover:border-[#454839] transition-colors"
      onClick={() => navigate('/gear')}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-[#C5C8B4]">
          <Wrench className="w-4 h-4 text-[#D4F684]" />
          <h3 className="font-mono text-xs uppercase tracking-widest font-bold">
            Tracker de Equipamentos
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="font-mono text-[9px] text-[#8F9380] bg-[#161C24] px-1.5 py-0.5 rounded border border-[#1F2937]">
              {activeCount} ATIVO{activeCount > 1 ? 'S' : ''}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-[#8F9380]" />
        </div>
      </div>

      {featured.length > 0 ? (
        <div className="flex flex-col gap-3 mt-1">
          {featured.map((gear) => {
            const meta = GEAR_VISUAL_META[gear.category] ?? GEAR_VISUAL_META.running_shoe;
            const Icon = meta.icon;
            const usage = getGearUsage(gear);
            const unitLabel = GEAR_USAGE_UNIT_LABEL[usage.unit]?.short ?? usage.unit;

            const usageText =
              usage.unit === 'km'
                ? `${gear.accumulatedDistanceKm.toFixed(1)} km`
                : usage.unit === 'rounds'
                ? `${gear.accumulatedRounds ?? 0} rounds`
                : `${gear.accumulatedSessions ?? 0} treinos`;

            return (
              <div
                key={gear.id}
                className="flex flex-col gap-1 p-2 bg-[#051424] rounded border border-[#1F2937]/50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta.bgColor }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    </div>
                    <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wide truncate max-w-[170px] sm:max-w-[240px]">
                      {gear.model}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {gear.isDefault && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-1 py-0.5 rounded bg-[#D4F684]/10 text-[#D4F684] border border-[#D4F684]/20">
                        Padrão
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-[#C5C8B4]">
                      {usageText}
                    </span>
                  </div>
                </div>

                <GearUsageBar usage={usage} label={`Uso (${unitLabel})`} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 bg-[#051424] rounded border border-[#1F2937] border-dashed">
          <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
            Nenhum equipamento cadastrado
          </span>
          <span className="font-mono text-xs text-[#D4E4FA] mt-1 underline decoration-[#D4F684]/50 underline-offset-4">
            Adicionar Tênis, Luvas, Kimono ou Bike
          </span>
        </div>
      )}
    </Card>
  );
};

/** Alias legado */
export const ShoeUsageSummary = GearUsageSummary;
