import React, { useState, useCallback, useEffect } from 'react';
import type { Exercise, ExerciseSearchParams } from '@pacelog/shared';
import { strengthApi } from '../../../services/strength.api';
import { Search, X, Dumbbell } from 'lucide-react';

interface ExerciseSearchProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState('');

  const muscleGroups = [
    { key: '', label: 'Todos' },
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
    { key: 'corpo_inteiro', label: 'Corpo inteiro' },
  ];

  const search = useCallback(
    async (q: string, muscle: string) => {
      setIsLoading(true);
      try {
        const params: ExerciseSearchParams = {
          query: q || undefined,
          muscleGroup: (muscle || undefined) as ExerciseSearchParams['muscleGroup'],
          limit: 40,
        };
        const result = await strengthApi.searchExercises(params);
        setResults(result.items || []);
      } catch {
        // falha silenciosa na busca
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Busca inicial com exercícios recentes
  useEffect(() => {
    search('', '');
  }, [search]);

  // Debounce na busca por texto
  useEffect(() => {
    const timer = setTimeout(() => search(query, selectedMuscle), 300);
    return () => clearTimeout(timer);
  }, [query, selectedMuscle, search]);

  return (
    <div
      className="flex flex-col bg-[#0D1C2D] border border-[#1F2937] rounded-xl w-full max-w-lg max-h-[82vh] shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden"
      role="dialog"
      aria-label="Adicionar exercício"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2937] bg-[#051424]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7]">
            <Dumbbell className="w-4 h-4" />
          </div>
          <h2 className="font-display text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
            Adicionar Exercício
          </h2>
        </div>
        <button
          id="btn-close-exercise-search"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Campo de busca */}
      <div className="p-4 bg-[#051424]/60 border-b border-[#1F2937]">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[#8F9380] pointer-events-none" />
          <input
            id="exercise-search-input"
            type="text"
            className="w-full bg-[#161C24] border border-[#1F2937] rounded-lg py-2.5 pl-10 pr-9 text-[#D4E4FA] placeholder-[#8F9380] outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7]/50 transition-all font-sans text-sm"
            placeholder="Buscar exercício (ex: supino, agachamento)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            aria-label="Buscar exercício"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 p-0.5 text-[#8F9380] hover:text-[#D4E4FA] rounded"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filtros por grupo muscular */}
      <div
        className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto border-b border-[#1F2937] bg-[#0D1C2D] scrollbar-none"
        role="group"
        aria-label="Filtrar por grupo muscular"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {muscleGroups.map((mg) => {
          const isSelected = selectedMuscle === mg.key;
          return (
            <button
              key={mg.key}
              id={`filter-muscle-${mg.key || 'all'}`}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wider font-semibold transition-all ${
                isSelected
                  ? 'bg-[#A855F7] text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-[1.02]'
                  : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA] hover:border-[#454839]'
              }`}
              onClick={() => setSelectedMuscle(mg.key)}
              aria-pressed={isSelected}
            >
              {mg.label}
            </button>
          );
        })}
      </div>

      {/* Lista de resultados */}
      <div
        className="flex flex-col flex-1 overflow-y-auto bg-[#051424] divide-y divide-[#1F2937]/50 min-h-[220px]"
        role="listbox"
        aria-label="Exercícios encontrados"
        aria-busy={isLoading}
      >
        {isLoading && (
          <div className="flex items-center justify-center p-8 font-mono text-xs text-[#8F9380] animate-pulse uppercase tracking-widest" aria-hidden="true">
            Buscando exercícios…
          </div>
        )}

        {!isLoading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-1">
            <span className="font-mono text-sm text-[#D4E4FA]">Nenhum exercício encontrado</span>
            <span className="font-sans text-xs text-[#8F9380]">Tente buscar por outro termo ou selecione "Todos".</span>
          </div>
        )}

        {!isLoading &&
          results.map((exercise) => (
            <button
              key={exercise.key}
              id={`exercise-option-${exercise.key}`}
              className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-[#161C24] transition-colors text-left group"
              onClick={() => onSelect(exercise)}
              role="option"
              aria-selected={false}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-sm font-bold text-[#D4E4FA] group-hover:text-[#A855F7] transition-colors">
                  {exercise.name}
                </span>
                {exercise.equipment && (
                  <span className="font-sans text-[11px] text-[#8F9380]">
                    {exercise.equipment}
                  </span>
                )}
              </div>
              {exercise.primaryMuscleGroup && (
                <span className="px-2.5 py-1 rounded-md bg-[#161C24] border border-[#1F2937] text-[#C5C8B4] font-mono text-[9px] uppercase font-bold tracking-widest group-hover:border-[#A855F7]/40 group-hover:text-[#A855F7] transition-colors">
                  {exercise.primaryMuscleGroup}
                </span>
              )}
            </button>
          ))}
      </div>
    </div>
  );
};
