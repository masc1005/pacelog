import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { HardDrive, AlertTriangle, X } from 'lucide-react';

interface DeleteLocalDataModalProps {
  onClose: () => void;
}

export const DeleteLocalDataModal: React.FC<DeleteLocalDataModalProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      // Limpa caches locais
      localStorage.removeItem('pacelog_user_settings_cache');
      sessionStorage.clear();

      // Limpa indexedDB se existir
      if (window.indexedDB) {
        try {
          window.indexedDB.deleteDatabase('pacelog-offline-db');
          window.indexedDB.deleteDatabase('pacelog-cache');
        } catch {
          // ignore
        }
      }

      addToast('Armazenamento e cache locais foram limpos com sucesso', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      addToast('Erro ao limpar dados locais', 'error');
      setIsClearing(false);
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
            <div className="w-8 h-8 rounded-lg bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center text-[#FFB800]">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
              Limpar Armazenamento Local
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

        <div className="flex flex-col gap-3 text-xs text-[#C5C8B4] leading-relaxed">
          <p>
            Esta ação apagará o cache de preferências, dados temporários e bancos offline armazenados exclusivamente neste navegador.
          </p>
          <div className="p-3 bg-[#161C24] border border-[#1F2937] rounded-lg flex items-center gap-2.5 text-[#D4E4FA]">
            <AlertTriangle className="w-4 h-4 text-[#FFB800] flex-shrink-0" />
            <span>Seus dados salvos no servidor PACELOG permanecerão 100% seguros.</span>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            className="flex-1 py-2.5 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors"
            onClick={onClose}
            disabled={isClearing}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isClearing}
            className="flex-1 py-2.5 px-3 bg-[#FFB800] text-[#051424] hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(255,184,0,0.3)] disabled:opacity-50"
          >
            {isClearing ? 'Limpando…' : 'Limpar Dados'}
          </button>
        </div>
      </div>
    </div>
  );
};
