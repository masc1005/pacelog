// ────────────────────────────────────────────────────────────────────────────
// SyncStatusIndicator
// Ícone no header com badge numérico de pendências.
// Abre PendingSyncBadge ao clicar.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PendingSyncBadge } from './PendingSyncBadge';

export const SyncStatusIndicator: React.FC = () => {
  const { pendingCount, failedItems, isSyncing } = useSyncQueue();
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasIssues = failedItems.length > 0;
  const total = pendingCount + failedItems.length;

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Não exibir o indicador se tudo está sincronizado e online
  if (isOnline && total === 0 && !isSyncing) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="relative flex items-center justify-center w-8 h-8 rounded-[4px] hover:bg-white/5 transition-colors"
        aria-label={`Sincronização: ${isSyncing ? 'em andamento' : total > 0 ? `${total} pendentes` : 'offline'}`}
        title={isSyncing ? 'Sincronizando...' : total > 0 ? `${total} itens pendentes` : 'Offline'}
      >
        {isSyncing ? (
          <Loader2 className="w-4 h-4 text-[#D4F684] animate-spin" />
        ) : !isOnline ? (
          <CloudOff className="w-4 h-4 text-[#8F9380]" />
        ) : hasIssues ? (
          <Cloud className="w-4 h-4 text-red-400" />
        ) : (
          <Cloud className="w-4 h-4 text-[#D4F684]" />
        )}

        {/* Badge numérico */}
        {total > 0 && !isSyncing && (
          <span
            className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold font-mono flex items-center justify-center px-0.5 ${
              hasIssues
                ? 'bg-red-500 text-white'
                : 'bg-[#D4F684] text-[#051424]'
            }`}
            aria-hidden="true"
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {isOpen && (
        <PendingSyncBadge onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};
