import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { GoalDTO } from '@pacelog/shared';
import { Edit3, X, Save } from 'lucide-react';

interface EditGoalModalProps {
  goal: GoalDTO;
  onClose: () => void;
  onSuccess: (updated: GoalDTO) => void;
}

export const EditGoalModal: React.FC<EditGoalModalProps> = ({ goal, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const [title, setTitle] = useState(goal.title);
  const [targetValue, setTargetValue] = useState(String(goal.targetValue));
  const [deadline, setDeadline] = useState(
    goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState(goal.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Título da meta é obrigatório', 'error');
      return;
    }
    const numTarget = Number(targetValue);
    if (isNaN(numTarget) || numTarget <= 0) {
      addToast('Valor alvo deve ser maior que zero', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await apiClient<GoalDTO>(`/api/goals/${goal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          targetValue: numTarget,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          notes: notes.trim() || null,
        }),
      });

      addToast('Meta atualizada com sucesso', 'success');
      onSuccess(updated);
      onClose();
    } catch (err) {
      addToast('Erro ao atualizar meta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <Card className="max-w-lg w-full p-6 bg-[#0D1C2D] border-[#1F2937] shadow-2xl flex flex-col gap-5 relative">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#5CA9E6]" />
            <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase">
              Editar Meta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8F9380] hover:text-[#D4E4FA] transition-colors p-1"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider">
              Título da Meta
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider">
                Valor Alvo ({goal.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider">
                Prazo Limite
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-wider">
              Anotações / Estratégia
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Treinar terças e quintas mantendo zona 2..."
              className="px-3.5 py-2.5 bg-[#161C24] border border-[#1F2937] focus:border-[#5CA9E6] text-[#D4E4FA] font-mono text-sm rounded-[4px] outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F2937]">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="tactile"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
