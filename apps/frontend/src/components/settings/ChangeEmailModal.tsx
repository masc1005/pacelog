import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../lib/api';
import { Mail, X } from 'lucide-react';

interface ChangeEmailModalProps {
  onClose: () => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === user?.email) return;
    setIsSubmitting(true);
    try {
      await apiClient('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      addToast('E-mail atualizado com sucesso', 'success');
      onClose();
    } catch {
      addToast('Erro ao atualizar e-mail', 'error');
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
            <div className="w-8 h-8 rounded-lg bg-[#5CA9E6]/15 border border-[#5CA9E6]/30 flex items-center justify-center text-[#5CA9E6]">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
              Alterar E-mail
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
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase">E-mail atual</span>
            <span className="font-mono text-xs text-[#D4E4FA] bg-[#161C24] p-2.5 rounded border border-[#1F2937]">
              {user?.email}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
              Novo E-mail
            </label>
            <input
              type="email"
              required
              placeholder="seu-novo-email@dominio.com"
              className="w-full input-precision p-2.5 text-xs font-mono bg-[#161C24] text-[#D4E4FA] border border-[#1F2937] rounded"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoFocus
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
              disabled={isSubmitting || !newEmail.trim()}
              className="flex-1 py-2.5 px-3 bg-[#5CA9E6] text-[#051424] hover:opacity-90 font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(92,169,230,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando…' : 'Atualizar E-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
