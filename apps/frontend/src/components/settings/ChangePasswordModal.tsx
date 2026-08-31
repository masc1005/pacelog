import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../lib/api';
import { Lock, X } from 'lucide-react';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('A nova senha e a confirmação não coincidem', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('A nova senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      addToast('Senha alterada com sucesso', 'success');
      onClose();
    } catch {
      addToast('Erro ao alterar senha. Verifique sua senha atual.', 'error');
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
            <div className="w-8 h-8 rounded-lg bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center text-[#FFB800]">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
              Alterar Senha
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
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Senha Atual
            </label>
            <input
              type="password"
              required
              placeholder="Digite sua senha atual"
              className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Mínimo de 6 caracteres"
              className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Repita a nova senha"
              className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

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
              disabled={isSubmitting || !currentPassword || !newPassword}
              className="flex-1 py-2.5 px-3 bg-[#FFB800] text-[#051424] hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(255,184,0,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? 'Alterando…' : 'Salvar Nova Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
