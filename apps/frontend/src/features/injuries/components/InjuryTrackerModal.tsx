import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Minus, Plus, X } from 'lucide-react';
import { INJURY_CATEGORIES, INJURY_REGIONS, type InjuryCategory, type InjuryDTO, type InjurySide } from '@pacelog/shared';
import { useInjuries } from '../hooks/useInjuries';

interface Props {
  open: boolean;
  onClose: () => void;
  initialRegion?: string;
  initialSeverity?: number;
}

const SIDES: Array<{ value: InjurySide; label: string }> = [
  { value: 'left', label: 'Esq' },
  { value: 'right', label: 'Dir' },
  { value: 'bilateral', label: 'Ambos' },
  { value: 'center', label: 'Centro' },
];

const CATEGORY_LABELS: Record<InjuryCategory, string> = {
  soreness_doms: 'Dor muscular / DOMS',
  tendon_overload: 'Sobrecarga de tendão',
  joint_discomfort: 'Desconforto articular',
  strain_or_pull: 'Estiramento',
  other: 'Outro',
};

export const InjuryTrackerModal: React.FC<Props> = ({
  open,
  onClose,
  initialRegion,
  initialSeverity,
}) => {
  const { injuries, create, update } = useInjuries();
  const [region, setRegion] = useState(initialRegion || 'ombro');
  const [side, setSide] = useState<InjurySide>('center');
  const [severity, setSeverity] = useState(initialSeverity ?? 3);
  const [category, setCategory] = useState<InjuryCategory>('soreness_doms');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRegion(initialRegion || 'ombro');
      setSeverity(initialSeverity ?? 3);
    }
  }, [open, initialRegion, initialSeverity]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = injuries.filter((item) => item.status !== 'resolved');

  const handleCreate = async () => {
    setSaving(true);
    try {
      await create({ region, side, severity, category, notes: notes.trim() || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const changeSeverity = (item: InjuryDTO, delta: number) => {
    const next = Math.max(1, Math.min(10, item.severity + delta));
    void update(item.id, { severity: next });
  };

  const resolve = (item: InjuryDTO) => {
    void update(item.id, { status: 'resolved', resolvedAt: new Date().toISOString() });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#1F2937] bg-[#0D1C2D] shadow-2xl">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937] shrink-0">
          <div>
            <div className="font-mono text-[10px] text-[#D4F684] uppercase tracking-widest">Pain map</div>
            <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase">Mapeamento de Lesões</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-[#8F9380] hover:text-white" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 space-y-5">
          {active.length > 0 && (
            <section className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">Ocorrências atuais</span>
              {active.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-[#1F2937] bg-[#161C24] p-3">
                  <AlertTriangle className="h-4 w-4 text-[#FF6B35] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#D4E4FA] capitalize">{item.region.replaceAll('_', ' ')}</div>
                    <div className="font-mono text-[10px] text-[#8F9380]">Severidade {item.severity}/10</div>
                  </div>
                  <button type="button" onClick={() => changeSeverity(item, -1)} className="p-2 rounded border border-[#1F2937]" aria-label="Reduzir dor">
                    <Minus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => changeSeverity(item, 1)} className="p-2 rounded border border-[#1F2937]" aria-label="Aumentar dor">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => resolve(item)} className="px-2 py-2 rounded border border-[#D4F684]/30 text-[#D4F684]" aria-label="Marcar como resolvida">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">Região</label>
            <div className="grid grid-cols-3 gap-2">
              {INJURY_REGIONS.map((item) => (
                <button key={item} type="button" onClick={() => setRegion(item)}
                  className={`px-2 py-2 rounded border text-xs capitalize ${region === item ? 'border-[#D4F684] bg-[#D4F684]/10 text-[#D4F684]' : 'border-[#1F2937] text-[#C5C8B4]'}`}>
                  {item.replaceAll('_', ' ')}
                </button>
              ))}
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">Lado</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {SIDES.map((item) => (
                  <button key={item.value} type="button" onClick={() => setSide(item.value)}
                    className={`py-2 rounded border text-xs ${side === item.value ? 'border-[#5CA9E6] bg-[#5CA9E6]/10 text-[#5CA9E6]' : 'border-[#1F2937] text-[#C5C8B4]'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">Severidade: {severity}/10</label>
              <input type="range" min={1} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-[#D4F684] mt-2" />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as InjuryCategory)}
                className="mt-2 w-full rounded-lg border border-[#1F2937] bg-[#161C24] px-3 py-2 text-sm text-[#D4E4FA]">
                {(INJURY_CATEGORIES as readonly InjuryCategory[]).map((item) => (
                  <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>
                ))}
              </select>
            </div>

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={3}
              placeholder="Observação curta"
              className="w-full resize-none rounded-lg border border-[#1F2937] bg-[#161C24] px-3 py-2 text-sm text-[#D4E4FA] placeholder:text-[#8F9380]" />
          </section>
        </div>

        <footer className="p-4 border-t border-[#1F2937] bg-[#0D1C2D] shrink-0">
          <button type="button" disabled={saving} onClick={() => void handleCreate()}
            className="w-full rounded-lg bg-[#D4F684] px-4 py-3 font-mono text-xs font-bold uppercase text-[#0D1C2D] disabled:opacity-60">
            {saving ? 'Registrando...' : 'Registrar dor / lesão'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};
