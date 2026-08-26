import React, { useState, useCallback, useEffect } from 'react';
import type { Exercise, ExerciseSearchParams } from '@pacelog/shared';
import { strengthApi } from '../../../services/strength.api';

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
          limit: 30,
        };
        const result = await strengthApi.searchExercises(params);
        setResults(result.items);
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
      className="flex flex-col bg-[#0D1C2D] border border-[#1F2937] rounded-[8px] w-full max-w-lg max-h-[80vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
      role="dialog"
      aria-label="Adicionar exercício"
      aria-modal="true"
    >
      <div className="flex items-center justify-between p-4 border-b border-[#1F2937] bg-[#051424]">
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">Adicionar exercício</h2>
        <button
          id="btn-close-exercise-search"
          className="flex items-center justify-center w-8 h-8 rounded-[2px] text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Campo de busca */}
      <div className="p-4 border-b border-[#1F2937]">
        <input
          id="exercise-search-input"
          type="search"
          className="w-full bg-[#161C24] border border-[#1F2937] rounded-[4px] py-3 px-4 text-[#D4E4FA] placeholder-[#8F9380] outline-none focus:border-[#D4F684] transition-colors font-mono text-sm"
          placeholder="Buscar exercício..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Buscar exercício"
        />
      </div>

      {/* Filtros por grupo muscular */}
      <div
        className="flex gap-2 p-3 overflow-x-auto border-b border-[#1F2937] bg-[#161C24] no-scrollbar"
        role="group"
        aria-label="Filtrar por grupo muscular"
      >
        {muscleGroups.map((mg) => (
          <button
            key={mg.key}
            id={`filter-muscle-${mg.key || 'all'}`}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full font-mono text-xs uppercase font-bold tracking-widest transition-colors ${
              selectedMuscle === mg.key
                ? 'bg-[#D4F684] text-[#0A0D14]'
                : 'bg-[#051424] text-[#8F9380] hover:text-[#D4E4FA] border border-[#1F2937]'
            }`}
            onClick={() => setSelectedMuscle(mg.key)}
            aria-pressed={selectedMuscle === mg.key}
          >
            {mg.label}
          </button>
        ))}
      </div>

      {/* Lista de resultados */}
      <div
        className="flex flex-col flex-1 overflow-y-auto bg-[#051424]"
        role="listbox"
        aria-label="Exercícios encontrados"
        aria-busy={isLoading}
      >
        {isLoading && (
          <div className="flex items-center justify-center p-8 font-mono text-sm text-[#8F9380] animate-pulse uppercase tracking-widest" aria-hidden="true">
            Buscando…
          </div>
        )}

        {!isLoading && results.length === 0 && (
          <div className="flex items-center justify-center p-8 font-mono text-sm text-[#8F9380]">
            Nenhum exercício encontrado.
          </div>
        )}

        {!isLoading && results.map((exercise) => (
          <button
            key={exercise.key}
            id={`exercise-option-${exercise.key}`}
            className="flex items-center justify-between w-full p-4 border-b border-[#1F2937]/50 hover:bg-[#161C24] transition-colors text-left group"
            onClick={() => onSelect(exercise)}
            role="option"
            aria-selected={false}
          >
            <span className="font-display font-bold text-[#D4E4FA] group-hover:text-[#D4F684] transition-colors">{exercise.name}</span>
            {exercise.primaryMuscleGroup && (
              <span className="px-2 py-0.5 rounded-[2px] bg-[#1F2937] text-[#C5C8B4] font-mono text-[10px] uppercase font-bold tracking-widest group-hover:bg-[#D4F684]/10 group-hover:text-[#D4F684] transition-colors">
                {exercise.primaryMuscleGroup}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
