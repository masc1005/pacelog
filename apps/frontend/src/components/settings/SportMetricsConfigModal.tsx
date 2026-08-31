import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Sliders, RotateCcw, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { UserSportDTO, SportMetricConfig } from '@pacelog/shared';

interface SportMetricsConfigModalProps {
  sport: UserSportDTO;
  onClose: () => void;
}

export const SportMetricsConfigModal: React.FC<SportMetricsConfigModalProps> = ({
  sport,
  onClose,
}) => {
  const { updateSport, restoreSportMetrics } = useSettings();
  const [metrics, setMetrics] = useState<SportMetricConfig[]>(() =>
    [...(sport.metricsConfig || [])].sort((a, b) => a.order - b.order)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleVisible = (metricKey: string) => {
    setMetrics((prev) =>
      prev.map((m) => {
        if (m.metricKey === metricKey) {
          if (m.isMandatory) return m; // Não permite desativar métrica mandatória
          return { ...m, visible: !m.visible };
        }
        return m;
      })
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newMetrics = [...metrics];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMetrics.length) return;

    const temp = newMetrics[index];
    newMetrics[index] = newMetrics[targetIndex];
    newMetrics[targetIndex] = temp;

    // Atualiza order
    const updated = newMetrics.map((m, idx) => ({ ...m, order: idx }));
    setMetrics(updated);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateSport(sport.sportKey, { metricsConfig: metrics });
      onClose();
    } catch {
      // toast disparado pelo context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setIsSubmitting(true);
    try {
      const restored = await restoreSportMetrics(sport.sportKey);
      setMetrics(restored.metricsConfig || []);
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
      <div className="bg-[#0D1C2D] border border-[#1F2937] p-6 rounded-xl max-w-lg w-full flex flex-col gap-5 shadow-[0_0_50px_rgba(0,0,0,0.6)] max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg border flex items-center justify-center"
              style={{
                backgroundColor: `${sport.color}15`,
                borderColor: `${sport.color}40`,
                color: sport.color,
              }}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
                Métricas — {sport.displayName}
              </h3>
              <span className="text-[11px] text-[#8F9380]">
                Defina os campos visíveis no wizard de telemetria.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8F9380] hover:text-[#D4E4FA] text-lg leading-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Métricas com toggles e ordenação */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {metrics.map((metric, idx) => (
            <div
              key={metric.metricKey}
              className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                metric.visible
                  ? 'bg-[#161C24] border-[#1F2937]'
                  : 'bg-[#0D1C2D]/50 border-[#1F2937]/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`metric-check-${metric.metricKey}`}
                  checked={metric.visible}
                  disabled={metric.isMandatory}
                  onChange={() => handleToggleVisible(metric.metricKey)}
                  className="w-4 h-4 rounded accent-[#D4F684] cursor-pointer"
                />
                <label
                  htmlFor={`metric-check-${metric.metricKey}`}
                  className="flex flex-col cursor-pointer"
                >
                  <span className="font-mono text-xs font-bold text-[#D4E4FA]">
                    {metric.label}
                  </span>
                  {metric.isMandatory && (
                    <span className="text-[10px] text-[#8F9380] font-mono uppercase">
                      Campo Obrigatório
                    </span>
                  )}
                </label>
              </div>

              {/* Botões de Reordenação */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-1 text-[#8F9380] hover:text-[#D4E4FA] disabled:opacity-20 rounded"
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === metrics.length - 1}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-1 text-[#8F9380] hover:text-[#D4E4FA] disabled:opacity-20 rounded"
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer com Restaurar Padrões e Salvar */}
        <div className="flex items-center justify-between border-t border-[#1F2937] pt-4 mt-1">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-xs font-mono text-[#8F9380] hover:text-[#FF6B35] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              className="py-2 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 py-2 px-4 bg-[#D4F684] text-[#051424] hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(212,246,132,0.3)] disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
