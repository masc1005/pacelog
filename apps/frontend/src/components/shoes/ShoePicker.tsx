import React, { useEffect, useState } from 'react';
import { shoeApi } from '../../services/shoe.api';
import type { RunningShoe } from '@pacelog/shared';
import { Footprints, Check, ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';

interface ShoePickerProps {
  value?: string;
  onChange: (shoeId: string | undefined) => void;
}

export const ShoePicker: React.FC<ShoePickerProps> = ({ value, onChange }) => {
  const [shoes, setShoes] = useState<RunningShoe[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    shoeApi.getShoes(false).then((data) => {
      setShoes(data);
      setIsLoading(false);
      // Pre-select default if none selected
      if (!value) {
        const defaultShoe = data.find((s: RunningShoe) => s.isDefault);
        if (defaultShoe) onChange(defaultShoe.id);
      }
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);

  const selectedShoe = shoes.find(s => s.id === value);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 animate-pulse">
        <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
          Tênis Usado
        </label>
        <div className="h-10 bg-[#161C24] rounded border border-[#1F2937]"></div>
      </div>
    );
  }

  // Se não tem tênis cadastrados, não bloqueia, só informa (opcional)
  if (shoes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-3">
      <label className="text-[10px] uppercase font-mono tracking-widest text-[#8F9380]">
        Tênis Usado
      </label>
      
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-3 bg-[#051424] border border-[#1F2937] hover:border-[#454839] rounded transition-all text-left"
        >
          {selectedShoe ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#38BDF8]/10 flex items-center justify-center flex-shrink-0">
                <Footprints className="w-4 h-4 text-[#38BDF8]" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm font-bold text-[#D4E4FA] uppercase tracking-wide">
                  {selectedShoe.model}
                </span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  {selectedShoe.accumulatedDistanceKm.toFixed(1)} km 
                  {selectedShoe.distanceLimitKm ? ` · ${Math.round((selectedShoe.accumulatedDistanceKm / selectedShoe.distanceLimitKm) * 100)}% do limite` : ''}
                </span>
              </div>
            </div>
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
              onChange(undefined);
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-[#161C24] transition-colors text-left"
          >
            <span className="font-mono text-sm text-[#8F9380]">Sem tênis</span>
            {!selectedShoe && <Check className="w-4 h-4 text-[#D4F684]" />}
          </button>
          
          {shoes.map(shoe => {
            const isSelected = shoe.id === value;
            return (
              <button
                key={shoe.id}
                type="button"
                onClick={() => {
                  onChange(shoe.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded transition-colors text-left ${isSelected ? 'bg-[#161C24]' : 'hover:bg-[#161C24]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#38BDF8]/10 flex items-center justify-center flex-shrink-0">
                    <Footprints className="w-4 h-4 text-[#38BDF8]" />
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-mono text-sm font-bold uppercase tracking-wide ${isSelected ? 'text-[#D4E4FA]' : 'text-[#8F9380]'}`}>
                      {shoe.model}
                    </span>
                    <span className="font-mono text-[10px] text-[#8F9380]">
                      {shoe.accumulatedDistanceKm.toFixed(1)} km 
                      {shoe.distanceLimitKm ? ` · ${Math.round((shoe.accumulatedDistanceKm / shoe.distanceLimitKm) * 100)}% do limite` : ''}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#D4F684]" />}
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
};
