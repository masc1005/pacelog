import React from 'react';
import {
  type Gear,
  getGearUsage,
  GEAR_CATEGORY_META,
  GEAR_USAGE_UNIT_LABEL,
} from '@pacelog/shared';
import { Card } from '../ui/Card';
import { Calendar, Edit3, Wrench } from 'lucide-react';
import { GearUsageBar } from './GearUsageBar';
import { GearStatusBadge } from './GearStatusBadge';
import { GEAR_VISUAL_META } from './gearMeta';

interface GearCardProps {
  gear: Gear;
  onEdit?: (gear: Gear) => void;
  onClick?: (gear: Gear) => void;
}

export const GearCard: React.FC<GearCardProps> = ({ gear, onEdit, onClick }) => {
  const meta = GEAR_VISUAL_META[gear.category] ?? GEAR_VISUAL_META.running_shoe;
  const Icon = meta.icon;
  const usage = getGearUsage(gear);
  const unitLabel = GEAR_USAGE_UNIT_LABEL[usage.unit]?.short ?? usage.unit;

  const primaryValue =
    usage.unit === 'km'
      ? `${gear.accumulatedDistanceKm.toFixed(1)} km`
      : usage.unit === 'rounds'
      ? `${gear.accumulatedRounds ?? 0} rounds`
      : `${gear.accumulatedSessions ?? 0} treinos`;

  const componentCount = gear.components?.length ?? 0;

  return (
    <Card
      className={`p-4 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3 ${
        onClick ? 'cursor-pointer hover:border-[#454839] transition-colors' : ''
      }`}
      onClick={() => onClick && onClick(gear)}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: meta.bgColor }}
          >
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide leading-tight">
              {gear.model}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
                {meta.label}
              </span>
              {gear.brand && (
                <>
                  <span className="text-[#454839]">•</span>
                  <span className="font-mono text-[10px] text-[#8F9380] uppercase tracking-widest">
                    {gear.brand}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <GearStatusBadge status={gear.status} isDefault={gear.isDefault} />
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(gear);
              }}
              className="text-[#8F9380] hover:text-[#D4E4FA] transition-colors p-1"
              aria-label="Editar equipamento"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <GearUsageBar usage={usage} label={`Uso (${unitLabel})`} />

        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#1F2937]/50">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] text-[#8F9380] uppercase">Uso Atual</span>
            <span className="font-mono text-sm font-bold text-[#D4E4FA]">{primaryValue}</span>
          </div>

          {GEAR_CATEGORY_META[gear.category]?.supportsComponents ? (
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[#8F9380] uppercase">Componentes</span>
              <span className="font-mono text-xs text-[#C5C8B4] flex items-center gap-1">
                <Wrench className="w-3 h-3 text-[#10B981]" />
                {componentCount} rastreado{componentCount === 1 ? '' : 's'}
              </span>
            </div>
          ) : gear.purchaseDate ? (
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[#8F9380] uppercase">Adquirido em</span>
              <span className="font-mono text-xs text-[#C5C8B4] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(gear.purchaseDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

/** Alias legado */
export const ShoeCard = GearCard as any;
