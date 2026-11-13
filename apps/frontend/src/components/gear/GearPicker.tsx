import React, { useEffect, useState } from 'react';
import { gearApi } from '../../services/gear.api';
import {
  type Gear,
  type GearCategory,
  getGearUsage,
  GEAR_CATEGORY_META,
} from '@pacelog/shared';
import { Check, ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { GEAR_VISUAL_META } from './gearMeta';

interface GearPickerProps {
  categories: GearCategory[];
  value?: string | null;
  onChange: (gearId: string | null) => void;
  label?: string;
  autoSelectDefault?: boolean;
}

export const GearPicker: React.FC<GearPickerProps> = ({
  categories,
  value,
  onChange,
  label,
  autoSelectDefault = true,
}) => {
  const [items, setItems] = useState<Gear[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const categoriesKey = categories.slice().sort().join(',');

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    gearApi
      .getGear(false)
      .then((data) => {
        if (isCancelled) return;
        const filtered = data.filter((g) => categories.includes(g.category));
        setItems(filtered);
        setIsLoading(false);

        // Pré-seleciona padrão apenas se solicitado e se nenhum valor estiver definido
        if (autoSelectDefault && (value === undefined || value === null) && filtered.length > 0) {
          const defaultItem = filtered.find((g) => g.isDefault);
          if (defaultItem) {
            onChange(defaultItem.id);
          }
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[GearPicker] Failed to load gear:', err);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [categoriesKey]);

  const selected = items.find((g) => g.id === value);

  // Rótulo padrão baseado na primeira categoria
  const firstCat = categories[0] ?? 'running_shoe';
  const displayLabel =
    label ||
    (categories.length === 1
      ? `${GEAR_CATEGORY_META[firstCat]?.singular ?? 'Equipamento'} Usado`
      : 'Equipamento Usado');

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 animate-pulse col-span-2 sm:col-span-3">
        <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
          {displayLabel}
        </label>
        <div className="h-10 bg-[#161C24] rounded border border-[#1F2937]" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const renderItemDetails = (gear: Gear) => {
    const meta = GEAR_VISUAL_META[gear.category] ?? GEAR_VISUAL_META.running_shoe;
    const Icon = meta.icon;
    const usage = getGearUsage(gear);
    

    const usageText =
      usage.unit === 'km'
        ? `${gear.accumulatedDistanceKm.toFixed(1)} km`
        : usage.unit === 'rounds'
        ? `${gear.accumulatedRounds ?? 0} rounds`
        : `${gear.accumulatedSessions ?? 0} treinos`;

    const limitText =
      usage.percent !== null ? ` · ${Math.round(usage.percent)}% do limite` : '';

    return (
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: meta.bgColor }}
        >
          <Icon className="w-4 h-4" style={{ color: meta.color }} />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-mono text-sm font-bold text-[#D4E4FA] uppercase tracking-wide">
            {gear.model}
          </span>
          <span className="font-mono text-[10px] text-[#8F9380]">
            {usageText}
            {limitText}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-3">
      <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
        {displayLabel}
      </label>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-3 bg-[#051424] border border-[#1F2937] hover:border-[#454839] rounded transition-all text-left"
        >
          {selected ? (
            renderItemDetails(selected)
          ) : (
            <span className="font-mono text-sm text-[#8F9380]">Nenhum selecionado</span>
          )}
          <ChevronDown className="w-4 h-4 text-[#8F9380]" />
        </button>
      ) : (
        <Card className="p-2 bg-[#051424] border-[#1F2937] flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-[#161C24] transition-colors text-left"
          >
            <span className="font-mono text-sm text-[#8F9380]">Sem equipamento</span>
            {!selected && <Check className="w-4 h-4 text-[#D4F684]" />}
          </button>

          {items.map((gear) => {
            const isSelected = gear.id === value;
            return (
              <button
                key={gear.id}
                type="button"
                onClick={() => {
                  onChange(gear.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded transition-colors text-left ${
                  isSelected ? 'bg-[#161C24]' : 'hover:bg-[#161C24]'
                }`}
              >
                {renderItemDetails(gear)}
                {isSelected && <Check className="w-4 h-4 text-[#D4F684]" />}
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
};

/** Alias legado */
export const ShoePicker: React.FC<{
  value?: string;
  onChange: (shoeId: string | undefined) => void;
}> = ({ value, onChange }) => {
  return (
    <GearPicker
      categories={['running_shoe']}
      value={value}
      onChange={(val) => onChange(val || undefined)}
      label="Tênis Usado"
    />
  );
};
