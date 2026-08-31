import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../lib/api';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteAccountModalProps {
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose }) => {
  const { signOut } = useAuth();
  const { addToast } = useToast();
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConfirmed = confirmationInput === 'EXCLUIR';

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await apiClient('/api/profile/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'EXCLUIR' }),
      });
      // Limpa storage local
      localStorage.clear();
      sessionStorage.clear();
      addToast('Sua conta e histórico foram permanentemente excluídos.', 'info');
      signOut();
    } catch {
      addToast('Erro ao excluir conta. Tente novamente.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0D1C2D] border border-[#FF3366]/40 p-6 rounded-xl max-w-md w-full flex flex-col gap-5 shadow-[0_0_50px_rgba(255,51,102,0.2)]">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF3366]/15 border border-[#FF3366]/30 flex items-center justify-center text-[#FF3366]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#FF3366] uppercase tracking-wide">
              Excluir Conta Permanentemente
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
            Esta ação é <strong className="text-[#FF3366]">irreversível</strong>. Todos os seus dados de telemetria, sessões de treino, metas, tênis, relatórios e preferências serão apagados imediatamente.
          </p>
          <p>
            Para confirmar a exclusão definitiva, digite <strong className="text-white font-mono bg-[#161C24] px-1.5 py-0.5 rounded border border-[#1F2937]">EXCLUIR</strong> no campo abaixo:
          </p>
        </div>

        <form onSubmit={handleDelete} className="flex flex-col gap-4">
          <input
            type="text"
            required
            placeholder="Digite EXCLUIR para confirmar"
            className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] focus:border-[#FF3366] rounded outline-none"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            autoFocus
          />

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
              disabled={!isConfirmed || isSubmitting}
              className="flex-1 py-2.5 px-3 bg-[#FF3366] text-white hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(255,51,102,0.3)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              {isSubmitting ? 'Excluindo…' : 'Excluir Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
