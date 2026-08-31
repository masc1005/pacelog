import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { GoalDTO } from '@pacelog/shared';
import { Trophy, CheckCircle2, X } from 'lucide-react';

interface GoalCelebrateModalProps {
  goal: GoalDTO;
  onClose: () => void;
}

export const GoalCelebrateModal: React.FC<GoalCelebrateModalProps> = ({ goal, onClose }) => {
  useEffect(() => {
    // Dispara confetes comemorativos em leque
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#D4F684', '#5CA9E6', '#FFB800', '#A855F7'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#D4F684', '#5CA9E6', '#FFB800', '#A855F7'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
    >
      <Card className="max-w-md w-full p-6 bg-[#0D1C2D] border-[#D4F684]/40 shadow-[0_0_50px_rgba(212,246,132,0.15)] flex flex-col items-center text-center gap-5 relative animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8F9380] hover:text-[#D4E4FA] transition-colors p-1"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone de Troféu / Conquista */}
        <div className="w-20 h-20 rounded-full bg-[#D4F684]/15 border border-[#D4F684]/50 flex items-center justify-center text-[#D4F684] shadow-[0_0_25px_rgba(212,246,132,0.3)] animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs text-[#D4F684] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> MARCO ALCANÇADO
          </span>
          <h2 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase">
            Meta Concluída!
          </h2>
          <p className="font-mono text-sm text-[#C5C8B4] mt-1">
            {goal.title}
          </p>
        </div>

        <div className="w-full bg-[#161C24] p-4 rounded-[4px] border border-[#1F2937] flex items-center justify-around">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase">Alvo Atingido</span>
            <span className="font-display text-lg font-bold text-[#D4E4FA]">
              {goal.targetValue} {goal.unit}
            </span>
          </div>
          <div className="h-8 w-px bg-[#1F2937]" />
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#8F9380] uppercase">Progresso</span>
            <span className="font-display text-lg font-bold text-[#D4F684]">
              100%
            </span>
          </div>
        </div>

        <div className="w-full pt-2 flex flex-col gap-2">
          <Button
            variant="tactile"
            size="lg"
            className="w-full font-mono text-sm uppercase tracking-wider py-3"
            onClick={onClose}
          >
            Continuar Evoluindo
          </Button>
        </div>
      </Card>
    </div>
  );
};
