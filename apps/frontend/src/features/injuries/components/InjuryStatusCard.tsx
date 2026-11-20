import React, { useState } from 'react';
import { AlertTriangle, Check, Minus, Plus } from 'lucide-react';
import { useInjuries } from '../hooks/useInjuries';
import { InjuryTrackerModal } from './InjuryTrackerModal';

export const InjuryStatusCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { injuries, update } = useInjuries();
  const [open, setOpen] = useState(false);
  const active = injuries.filter((item) => item.status === 'active' || item.status === 'recovering');

  if (active.length === 0) return null;

  return (
    <>
      <div className={`rounded-lg border border-[#FF6B35]/30 bg-[#FF6B35]/5 ${compact ? 'p-2' : 'p-3'}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FF6B35] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => setOpen(true)} className="text-left">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#FF6B35]">
                {active.length} ocorrência{active.length > 1 ? 's' : ''} ativa{active.length > 1 ? 's' : ''}
              </span>
              {!compact && (
                <div className="mt-1 text-sm text-[#D4E4FA]">
                  {active.slice(0, 3).map((item) => `${item.region.replaceAll('_', ' ')} ${item.severity}/10`).join(' • ')}
                </div>
              )}
            </button>
            {active.slice(0, compact ? 1 : 3).map((item) => (
              <div key={item.id} className="mt-2 flex items-center gap-1">
                <button type="button" aria-label="Reduzir dor" onClick={() => void update(item.id, { severity: Math.max(1, item.severity - 1) })}
                  className="p-1.5 border border-[#1F2937] rounded"><Minus className="h-3 w-3" /></button>
                <button type="button" aria-label="Aumentar dor" onClick={() => void update(item.id, { severity: Math.min(10, item.severity + 1) })}
                  className="p-1.5 border border-[#1F2937] rounded"><Plus className="h-3 w-3" /></button>
                <button type="button" aria-label="Marcar resolvida" onClick={() => void update(item.id, { status: 'resolved', resolvedAt: new Date().toISOString() })}
                  className="ml-1 p-1.5 border border-[#D4F684]/30 text-[#D4F684] rounded"><Check className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <InjuryTrackerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
