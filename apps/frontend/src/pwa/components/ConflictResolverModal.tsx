// ────────────────────────────────────────────────────────────────────────────
// ConflictResolverModal
// Exibido quando um item da fila retorna 409 do servidor.
// Permite ao usuário escolher entre manter o remoto ou reenviaar o local.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { AlertTriangle, Server, Smartphone } from 'lucide-react';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { describeConflict } from '../services/conflictResolver.service';

const OPERATION_LABELS: Record<string, string> = {
  create_session: 'Criar treino',
  update_session: 'Atualizar treino',
  delete_session: 'Excluir treino',
  update_settings: 'Configurações',
  strength_finish_session: 'Finalizar sessão de força',
};

export const ConflictResolverModal: React.FC = () => {
  const { conflicts, resolveConflict } = useSyncQueue();

  if (conflicts.length === 0) return null;

  // Resolver um de cada vez — mostrar o primeiro
  const conflict = conflicts[0];
  const { remoteLabel, localLabel } = describeConflict(conflict);
  const operationLabel =
    OPERATION_LABELS[conflict.queueItem.operationType] ?? conflict.queueItem.operationType;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-[#0D1C2D] border border-yellow-500/30 rounded-[4px] shadow-2xl flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#1F2937]">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 id="conflict-title" className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wide">
              Conflito de dados detectado
            </h2>
            <p className="font-mono text-xs text-[#8F9380] mt-1">
              Operação: <span className="text-[#C5C8B4]">{operationLabel}</span>
            </p>
            {conflicts.length > 1 && (
              <p className="font-mono text-xs text-yellow-400 mt-0.5">
                + {conflicts.length - 1} {conflicts.length - 1 === 1 ? 'conflito' : 'conflitos'} adicional
              </p>
            )}
          </div>
        </div>

        {/* Descrição */}
        <div className="px-5 py-4">
          <p className="font-mono text-xs text-[#8F9380] leading-relaxed">
            Este dado foi alterado em outro dispositivo enquanto você estava offline.
            Escolha qual versão deve prevalecer:
          </p>
        </div>

        {/* Opções */}
        <div className="px-5 pb-4 flex flex-col gap-3">
          {/* Servidor */}
          <button
            onClick={() => resolveConflict(conflict.queueItem.id, 'server')}
            className="group flex items-start gap-3 w-full text-left p-3 border border-[#1F2937] hover:border-[#38BDF8]/50 hover:bg-[#38BDF8]/5 rounded-[4px] transition-all"
          >
            <Server className="w-4 h-4 text-[#38BDF8] mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-mono text-xs font-bold text-[#D4E4FA] group-hover:text-[#38BDF8] transition-colors">
                Manter versão do servidor
              </p>
              <p className="font-mono text-xs text-[#8F9380] mt-0.5">{remoteLabel}</p>
            </div>
          </button>

          {/* Local */}
          <button
            onClick={() => resolveConflict(conflict.queueItem.id, 'local')}
            className="group flex items-start gap-3 w-full text-left p-3 border border-[#1F2937] hover:border-[#D4F684]/50 hover:bg-[#D4F684]/5 rounded-[4px] transition-all"
          >
            <Smartphone className="w-4 h-4 text-[#D4F684] mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-mono text-xs font-bold text-[#D4E4FA] group-hover:text-[#D4F684] transition-colors">
                Usar minha versão local
              </p>
              <p className="font-mono text-xs text-[#8F9380] mt-0.5">{localLabel}</p>
            </div>
          </button>
        </div>

        <div className="px-5 pb-4">
          <p className="font-mono text-[10px] text-[#8F9380]">
            Esta escolha é permanente e não pode ser desfeita.
          </p>
        </div>
      </div>
    </div>
  );
};
