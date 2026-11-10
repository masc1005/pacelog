import React, { useState } from 'react';
import { Sparkles, Play, Bookmark, RefreshCw, Trash2, ChevronDown, ChevronUp, Clock, Target } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { strengthApi } from '../../../services/strength.api';
import { useToast } from '../../../contexts/ToastContext';
import type {
  GeneratedStrengthWorkoutDTO,
  StrengthRoutineDTO,
  StrengthWorkoutGoal,
} from '@pacelog/shared';

interface AIWorkoutBuilderCardProps {
  onStartGeneratedWorkout: (workout: GeneratedStrengthWorkoutDTO) => Promise<void>;
  onRoutineSaved: (routine: StrengthRoutineDTO) => void;
  disabled?: boolean;
}

const MUSCLE_PRESETS = [
  { key: 'peito', label: 'Peito' },
  { key: 'costas', label: 'Costas' },
  { key: 'ombros', label: 'Ombros' },
  { key: 'biceps', label: 'Bíceps' },
  { key: 'triceps', label: 'Tríceps' },
  { key: 'quadriceps', label: 'Quadríceps' },
  { key: 'posteriores', label: 'Posteriores' },
  { key: 'gluteos', label: 'Glúteos' },
  { key: 'panturrilhas', label: 'Panturrilhas' },
  { key: 'abdomen', label: 'Abdômen' },
];

const QUICK_SPLITS = [
  { label: 'Sugerir p/ Hoje', muscles: [] as string[], hint: 'IA analisa seu histórico recente' },
  { label: 'Push (Empurrar)', muscles: ['peito', 'ombros', 'triceps'], hint: 'Peito, Ombros e Tríceps' },
  { label: 'Pull (Puxar)', muscles: ['costas', 'biceps'], hint: 'Costas, Dorsal e Bíceps' },
  { label: 'Legs (Pernas)', muscles: ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas'], hint: 'Inferiores completo' },
  { label: 'Upper Body', muscles: ['peito', 'costas', 'ombros', 'biceps', 'triceps'], hint: 'Superiores completo' },
];

const DURATION_OPTIONS = [30, 45, 60, 75];

const GOAL_OPTIONS: Array<{ key: StrengthWorkoutGoal; label: string }> = [
  { key: 'hypertrophy', label: 'Hipertrofia' },
  { key: 'strength', label: 'Força' },
  { key: 'endurance', label: 'Resistência' },
  { key: 'full_body', label: 'Funcional / Geral' },
];

export const AIWorkoutBuilderCard: React.FC<AIWorkoutBuilderCardProps> = ({
  onStartGeneratedWorkout,
  onRoutineSaved,
  disabled = false,
}) => {
  const { success, error: toastError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [goal, setGoal] = useState<StrengthWorkoutGoal>('hypertrophy');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedStrengthWorkoutDTO | null>(null);

  const toggleMuscle = (muscleKey: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscleKey)
        ? prev.filter((m) => m !== muscleKey)
        : [...prev, muscleKey]
    );
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await strengthApi.generateWorkoutWithAI({
        prompt: customPrompt.trim() || undefined,
        muscleGroups: selectedMuscles.length > 0 ? selectedMuscles : undefined,
        durationMinutes,
        goal,
      });
      setGeneratedWorkout(result);
    } catch (err: any) {
      toastError(err?.message || 'Não foi possível gerar o treino com a IA Personal.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveGeneratedExercise = (indexToRemove: number) => {
    if (!generatedWorkout) return;
    const updatedExercises = generatedWorkout.exercises
      .filter((_, idx) => idx !== indexToRemove)
      .map((ex, idx) => ({ ...ex, order: idx }));

    setGeneratedWorkout({
      ...generatedWorkout,
      exercises: updatedExercises,
    });
  };

  const handleStartNow = async () => {
    if (!generatedWorkout || generatedWorkout.exercises.length === 0) return;
    setIsStarting(true);
    try {
      await onStartGeneratedWorkout(generatedWorkout);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSaveAsRoutine = async () => {
    if (!generatedWorkout || generatedWorkout.exercises.length === 0 || isSavingRoutine) return;
    setIsSavingRoutine(true);
    try {
      const saved = await strengthApi.createRoutine({
        name: generatedWorkout.name,
        description: generatedWorkout.description,
        exercises: generatedWorkout.exercises,
      });
      onRoutineSaved(saved);
      success(`Ficha "${saved.name}" salva nas suas fichas!`);
    } catch (err: any) {
      toastError(err?.message || 'Erro ao salvar ficha gerada.');
    } finally {
      setIsSavingRoutine(false);
    }
  };

  return (
    <Card className="bg-[#0D1C2D] border-[#A855F7]/40 overflow-hidden transition-all">
      {/* Cabeçalho clicável (opcional para o usuário expandir ou recolher) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[#161C24]/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[4px] bg-[#D4F684]/10 border border-[#D4F684]/40 flex items-center justify-center text-[#D4F684]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase tracking-wider">
                Montar com IA Personal
              </span>
              <Badge variant="green" size="sm">
                Opcional
              </Badge>
            </div>
            <span className="font-mono text-[11px] text-[#8F9380]">
              Sugere exercícios, séries e cargas ideais para hoje
            </span>
          </div>
        </div>
        <div className="text-[#8F9380]">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-2 border-t border-[#1F2937] flex flex-col gap-4">
          {/* Atalhos rápidos de divisão */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4]">
              Divisão Rápida
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SPLITS.map((split) => {
                const isSelected =
                  split.muscles.length === selectedMuscles.length &&
                  split.muscles.every((m) => selectedMuscles.includes(m));
                return (
                  <button
                    key={split.label}
                    type="button"
                    onClick={() => setSelectedMuscles(split.muscles)}
                    title={split.hint}
                    className={`px-2.5 py-1 rounded-[4px] font-mono text-[11px] border transition-colors ${
                      isSelected
                        ? 'bg-[#D4F684]/15 border-[#D4F684] text-[#D4F684] font-bold'
                        : 'bg-[#161C24] border-[#1F2937] text-[#C5C8B4] hover:border-[#8F9380]'
                    }`}
                  >
                    {split.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção fina por grupamento muscular */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4]">
                Foco Muscular {selectedMuscles.length === 0 && '(Automático pelo histórico)'}
              </span>
              {selectedMuscles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMuscles([])}
                  className="font-mono text-[10px] text-[#8F9380] hover:text-[#D4F684]"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_PRESETS.map((m) => {
                const active = selectedMuscles.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleMuscle(m.key)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                      active
                        ? 'bg-[#A855F7]/20 border-[#A855F7] text-[#D4E4FA]'
                        : 'bg-[#161C24] border-[#1F2937] text-[#8F9380] hover:text-[#C5C8B4]'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tempo disponível e Objetivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4] flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#5CA9E6]" /> Tempo Disponível
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATION_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-1.5 rounded font-mono text-xs border transition-colors ${
                      durationMinutes === mins
                        ? 'bg-[#5CA9E6]/20 border-[#5CA9E6] text-[#D4E4FA] font-bold'
                        : 'bg-[#161C24] border-[#1F2937] text-[#8F9380]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4] flex items-center gap-1">
                <Target className="h-3 w-3 text-[#D4F684]" /> Objetivo
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGoal(g.key)}
                    className={`py-1.5 px-2 rounded font-mono text-[11px] border transition-colors truncate ${
                      goal === g.key
                        ? 'bg-[#D4F684]/15 border-[#D4F684] text-[#D4F684] font-bold'
                        : 'bg-[#161C24] border-[#1F2937] text-[#8F9380]'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pedido personalizado livre */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ai-personal-prompt"
              className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4]"
            >
              Instruções para a IA Personal (Opcional)
            </label>
            <input
              id="ai-personal-prompt"
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Priorizar halteres e polia, evitar agachamento com barra..."
              maxLength={300}
              className="w-full bg-[#161C24] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded-[4px] px-3 py-2 outline-none"
            />
          </div>

          <Button
            variant="secondary"
            size="md"
            isLoading={isGenerating}
            disabled={disabled || isStarting}
            onClick={handleGenerate}
            leftIcon={
              generatedWorkout ? (
                <RefreshCw className="h-4 w-4 text-[#D4F684]" />
              ) : (
                <Sparkles className="h-4 w-4 text-[#D4F684]" />
              )
            }
            className="w-full justify-center border-[#D4F684]/40 hover:border-[#D4F684] text-[#D4E4FA] bg-[#161C24]"
          >
            {generatedWorkout ? 'Gerar Outra Sugestão' : 'Sugerir Treino com IA Personal'}
          </Button>

          {/* Preview do treino gerado */}
          {generatedWorkout && (
            <div className="mt-1 p-4 rounded-[4px] bg-[#161C24] border border-[#A855F7]/40 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base font-bold text-[#D4F684]">
                      {generatedWorkout.name}
                    </h3>
                    {generatedWorkout.modelUsed && (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#0D1C2D] border border-[#1F2937] text-[#8F9380]">
                        {generatedWorkout.modelUsed}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-[#C5C8B4]">
                    {generatedWorkout.description}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#0D1C2D] border border-[#1F2937] font-sans text-xs text-[#8F9380] leading-relaxed">
                <strong className="font-mono text-[10px] uppercase text-[#A855F7] block mb-0.5">
                  Racional do IA Personal:
                </strong>
                {generatedWorkout.rationale}
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4]">
                  Exercícios Selecionados ({generatedWorkout.exercises.length})
                </span>
                {generatedWorkout.exercises.map((ex, idx) => {
                  const firstSet = ex.sets?.[0];
                  return (
                    <div
                      key={`${ex.exerciseKey}-${idx}`}
                      className="p-2.5 rounded bg-[#0D1C2D] border border-[#1F2937] flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#A855F7] font-bold">
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-xs text-[#D4E4FA] font-semibold truncate">
                            {ex.exerciseNameSnapshot}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-[#8F9380]">
                          <span>
                            {ex.sets?.length || 3} séries × {firstSet?.reps || 10} reps
                          </span>
                          {firstSet?.load != null && firstSet.load > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-[#D4F684]">
                                Ref: {firstSet.load} {firstSet.loadUnit || 'kg'}
                              </span>
                            </>
                          )}
                          {firstSet?.restSeconds && (
                            <>
                              <span>•</span>
                              <span>Descanso: {firstSet.restSeconds}s</span>
                            </>
                          )}
                        </div>
                        {ex.notes && (
                          <span className="font-sans text-[11px] text-[#8F9380] italic">
                            {ex.notes}
                          </span>
                        )}
                      </div>

                      {generatedWorkout.exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGeneratedExercise(idx)}
                          className="p-1.5 text-[#8F9380] hover:text-[#FFB4AB] rounded transition-colors shrink-0"
                          title="Remover exercício da sugestão"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="tactile"
                  size="sm"
                  isLoading={isStarting}
                  disabled={disabled || isSavingRoutine || generatedWorkout.exercises.length === 0}
                  onClick={handleStartNow}
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                  className="flex-1 justify-center"
                >
                  Iniciar Este Treino
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isSavingRoutine}
                  disabled={disabled || isStarting || generatedWorkout.exercises.length === 0}
                  onClick={handleSaveAsRoutine}
                  leftIcon={<Bookmark className="h-3.5 w-3.5 text-[#A855F7]" />}
                  className="flex-1 justify-center border-[#A855F7]/40 text-[#D4E4FA] bg-[#0D1C2D]"
                >
                  Salvar nas Fichas
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
