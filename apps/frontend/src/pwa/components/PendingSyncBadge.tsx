// ────────────────────────────────────────────────────────────────────────────
// PendingSyncBadge
// Lista expandida dos itens pendentes de sincronização.
// Abre em popover ao clicar no SyncStatusIndicator.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { RefreshCw, AlertTriangle, Check, X } from 'lucide-react';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OPERATION_LABELS: Record<string, string> = {
  create_session: 'Criar treino',
  update_session: 'Atualizar treino',
  delete_session: 'Excluir treino',
  update_settings: 'Salvar configurações',
  strength_finish_session: 'Finalizar sessão de força',
};

interface PendingSyncBadgeProps {
  onClose: () => void;
}

export const PendingSyncBadge: React.FC<PendingSyncBadgeProps> = ({ onClose }) => {
  const { pendingCount, failedItems, isSyncing, syncNow, dismissFailed } = useSyncQueue();
  const isOnline = useOnlineStatus();

  const total = pendingCount + failedItems.length;

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 bg-[#0D1C2D] border border-[#1F2937] rounded-[4px] shadow-2xl z-50 overflow-hidden"
      role="dialog"
      aria-label="Pendências de sincronização"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937]">
        <span className="font-mono text-xs uppercase text-[#D4E4FA] font-bold tracking-wider">
          Sincronização
        </span>
        <button
          onClick={onClose}
          className="text-[#8F9380] hover:text-[#D4E4FA] transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#8F9380]">
          <Check className="w-6 h-6 text-[#D4F684]" />
          <p className="font-mono text-xs">Tudo sincronizado</p>
        </div>
      )}

      {/* Itens pendentes */}
      {pendingCount > 0 && (
        <div className="p-3 flex flex-col gap-2">
          <p className="font-mono text-xs text-[#8F9380] uppercase">
            Aguardando rede ({pendingCount})
          </p>
          {/* Placeholder — lista detalhada viria de getQueueSnapshot */}
          <div className="bg-[#161C24] rounded p-2 text-xs text-[#C5C8B4] font-mono">
            {pendingCount} {pendingCount === 1 ? 'operação pendente' : 'operações pendentes'}
          </div>
        </div>
      )}

      {/* Itens com falha */}
      {failedItems.length > 0 && (
        <div className="p-3 flex flex-col gap-2 border-t border-[#1F2937]">
          <p className="font-mono text-xs text-red-400 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Falhas ({failedItems.length})
          </p>
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
            {failedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded p-2"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-xs text-[#D4E4FA] truncate">
                    {OPERATION_LABELS[item.operationType] ?? item.operationType}
                  </span>
                  {item.lastError && (
                    <span className="font-mono text-[10px] text-red-400 truncate">
                      {item.lastError}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => dismissFailed(item.id)}
                  className="text-[#8F9380] hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                  aria-label="Descartar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer — sync button */}
      <div className="px-4 py-3 border-t border-[#1F2937]">
        <button
          onClick={() => { syncNow(); onClose(); }}
          disabled={!isOnline || isSyncing}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#D4F684]/10 border border-[#D4F684]/30 text-[#D4F684] hover:bg-[#D4F684]/20 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-xs uppercase font-bold tracking-widest rounded-[4px] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
        {!isOnline && (
          <p className="text-center font-mono text-[10px] text-[#8F9380] mt-2">
            Aguardando conexão
          </p>
        )}
      </div>
    </div>
  );
};
