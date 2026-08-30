import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveStrengthSession } from '../../features/strength/hooks/useActiveStrengthSession';
import { useSessionTimer, formatDuration } from '../../features/strength/hooks/useSessionTimer';
import { strengthApi } from '../../services/strength.api';
import { Dumbbell, ArrowRight, X } from 'lucide-react';

export const ActiveStrengthFloatingBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, setSession } = useActiveStrengthSession();
  const elapsedSeconds = useSessionTimer(session);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Não exibe se não houver sessão ativa ou se o usuário já estiver na tela de treino/revisão
  if (!session || location.pathname.startsWith('/strength')) {
    return null;
  }

  const isPaused = session.status === 'paused';

  async function handleConfirmDiscard() {
    if (!session) return;
    setIsDiscarding(true);
    try {
      await strengthApi.cancelSession(session.id);
      setSession(null);
    } catch (err) {
      console.error('Erro ao descartar sessão em segundo plano:', err);
      setSession(null);
    } finally {
      setIsDiscarding(false);
      setShowDiscardModal(false);
    }
  }

  return (
    <>
      <div
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40 bg-[#0D1C2D]/95 backdrop-blur-md border border-[#A855F7]/40 shadow-[0_8px_30px_rgba(168,85,247,0.25)] rounded-xl p-3 flex items-center justify-between transition-all animate-in slide-in-from-bottom-5"
        role="complementary"
        aria-label="Sessão de musculação em andamento"
      >
        <div
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate('/strength/active')}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#A855F7] flex-shrink-0">
            <Dumbbell className="w-5 h-5 animate-pulse" />
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                isPaused ? 'bg-[#FFB800]' : 'bg-[#D4F684]'
              } ring-2 ring-[#0D1C2D] animate-ping`}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#A855F7]">
              {isPaused ? 'Treino Pausado' : 'Treino em Andamento'}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#D4E4FA]">
                {formatDuration(elapsedSeconds)}
              </span>
              <span className="font-mono text-[10px] text-[#8F9380] truncate">
                · {session.exercises.length}{' '}
                {session.exercises.length === 1 ? 'exercício' : 'exercícios'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full text-[#8F9380] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowDiscardModal(true);
            }}
            title="Descartar treino"
            aria-label="Descartar treino"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A855F7] hover:bg-[#9333ea] text-white font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-all shadow-md active:scale-95"
            onClick={() => navigate('/strength/active')}
          >
            <span>Retomar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal de confirmação para descarte em segundo plano */}
      {showDiscardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#0D1C2D] border border-[#1F2937] p-6 rounded-lg max-w-sm w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
                Descartar Treino?
              </h3>
              <p className="font-mono text-xs text-[#8F9380] leading-relaxed">
                Tem certeza que deseja desistir desta sessão? O progresso não será salvo no histórico.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                className="flex-1 py-2.5 px-3 border border-[#1F2937] text-[#C5C8B4] hover:bg-[#161C24] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors"
                onClick={() => setShowDiscardModal(false)}
                disabled={isDiscarding}
              >
                Voltar
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 px-3 bg-[#FF6B35] text-[#0A0D14] hover:bg-[#e05a2b] font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-colors shadow-[0_0_10px_rgba(255,107,53,0.2)] disabled:opacity-50"
                onClick={handleConfirmDiscard}
                disabled={isDiscarding}
              >
                {isDiscarding ? 'Descartando…' : 'Descartar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
