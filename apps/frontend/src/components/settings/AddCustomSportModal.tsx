import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Activity, Dumbbell, Flame, Zap, Sun, Waves, Bike, Shield, Trophy, X } from 'lucide-react';

interface AddCustomSportModalProps {
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Activity', icon: Activity },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Flame', icon: Flame },
  { name: 'Zap', icon: Zap },
  { name: 'Sun', icon: Sun },
  { name: 'Waves', icon: Waves },
  { name: 'Bike', icon: Bike },
  { name: 'Shield', icon: Shield },
  { name: 'Trophy', icon: Trophy },
];

const PRESET_COLORS = [
  '#00F0FF',
  '#39FF14',
  '#FFB800',
  '#FF3366',
  '#A855F7',
  '#38BDF8',
  '#10B981',
  '#F43F5E',
  '#EAB308',
  '#D4F684',
];

export const AddCustomSportModal: React.FC<AddCustomSportModalProps> = ({ onClose }) => {
  const { createCustomSport } = useSettings();
  const [displayName, setDisplayName] = useState('');
  const [icon, setIcon] = useState('Activity');
  const [color, setColor] = useState('#D4F684');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    try {
      await createCustomSport({
        displayName: displayName.trim(),
        icon,
        color,
      });
      onClose();
    } catch {
      // toast disparado pelo context
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
            <div
              className="w-8 h-8 rounded-lg border flex items-center justify-center"
              style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
            >
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
              Adicionar Esporte Personalizado
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
          {/* Nome do Esporte */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Nome da Modalidade
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Beach Tennis, Remo, Crossfit..."
              className="w-full input-precision p-2.5 text-xs font-sans bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Escolha de Ícone */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Ícone
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#161C24] border-2 text-white scale-105'
                        : 'bg-[#051424] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA]'
                    }`}
                    style={isSelected ? { borderColor: color, color } : undefined}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Escolha de Cor */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Cor Neon de Destaque
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
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
              disabled={isSubmitting || !displayName.trim()}
              className="flex-1 py-2.5 px-3 bg-[#D4F684] text-[#051424] hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(212,246,132,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? 'Criando…' : 'Criar Esporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
