import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { GoalDTO } from '@pacelog/shared';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteGoalModalProps {
  goal: GoalDTO;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteGoalModal: React.FC<DeleteGoalModalProps> = ({ goal, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient(`/api/goals/${goal.id}`, { method: 'DELETE' });
      addToast('Meta excluída com sucesso', 'info');
      onSuccess();
    } catch {
      addToast('Erro ao excluir meta', 'error');
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <Card className="max-w-md w-full p-6 bg-[#0D1C2D] border-red-500/30 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-400">
          <div className="p-2 bg-red-500/10 rounded-[4px] border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-[#D4E4FA] uppercase">
              Excluir Meta
            </h2>
            <span className="font-mono text-xs text-red-400">Ação permanente</span>
          </div>
        </div>

        <p className="font-mono text-xs text-[#8F9380] leading-relaxed">
          Tem certeza que deseja excluir a meta <strong className="text-[#D4E4FA]">"{goal.title}"</strong>?
          Seus treinos e telemetrias registradas <strong className="text-[#D4E4FA]">não</strong> serão afetados.
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F2937]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Excluir Meta
          </Button>
        </div>
      </Card>
    </div>
  );
};
