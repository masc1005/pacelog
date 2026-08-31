// ────────────────────────────────────────────────────────────────────────────
// OfflineBanner
// Banner discreto, não bloqueante, exibido quando o usuário está sem rede.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-[#161C24] border-t border-[#D4F684]/20 px-4 py-2.5 text-xs font-mono text-[#D4F684] animate-in slide-in-from-bottom-2 duration-300"
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>Você está offline. Suas atividades continuam sendo salvas normalmente.</span>
    </div>
  );
};
