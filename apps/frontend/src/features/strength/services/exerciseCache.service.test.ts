import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchCachedExercises,
  invalidateExerciseCache,
} from './exerciseCache.service';
import type { Exercise } from '@pacelog/shared';

describe('Exercise Client Cache Service Tests', () => {
  const sampleLibrary: Exercise[] = [
    {
      key: 'bench_press',
      name: 'Supino Reto com Barra',
      nameAlternatives: ['Supino Horizontal', 'Bench Press'],
      primaryMuscleGroup: 'peito',
      equipment: 'barbell',
      type: 'compound',
      isSystem: true,
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      key: 'squat',
      name: 'Agachamento Livre',
      nameAlternatives: ['Back Squat'],
      primaryMuscleGroup: 'quadriceps',
      equipment: 'barbell',
      type: 'compound',
      isSystem: true,
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      key: 'incline_dumbbells',
      name: 'Supino Inclinado com Halteres',
      nameAlternatives: ['Incline DB Press'],
      primaryMuscleGroup: 'peito',
      equipment: 'dumbbell',
      type: 'compound',
      isSystem: true,
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    invalidateExerciseCache();
  });

  describe('searchCachedExercises', () => {
    it('deve retornar todos os exercícios quando query e muscleGroup forem vazios', () => {
      const results = searchCachedExercises('', '', sampleLibrary);
      expect(results).toHaveLength(3);
    });

    it('deve filtrar por grupo muscular', () => {
      const results = searchCachedExercises('', 'peito', sampleLibrary);
      expect(results).toHaveLength(2);
      expect(results.every((ex) => ex.primaryMuscleGroup === 'peito')).toBe(true);
    });

    it('deve filtrar por nome com busca insensível a maiúsculas e acentos', () => {
      const results = searchCachedExercises('supino', '', sampleLibrary);
      expect(results).toHaveLength(2);

      const squatResult = searchCachedExercises('agachamento', '', sampleLibrary);
      expect(squatResult).toHaveLength(1);
      expect(squatResult[0].key).toBe('squat');
    });

    it('deve buscar em nomes alternativos', () => {
      const results = searchCachedExercises('bench press', '', sampleLibrary);
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('bench_press');
    });

    it('deve combinar filtro de grupo muscular e termo de busca', () => {
      const results = searchCachedExercises('inclinado', 'peito', sampleLibrary);
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('incline_dumbbells');

      const emptyResults = searchCachedExercises('inclinado', 'quadriceps', sampleLibrary);
      expect(emptyResults).toHaveLength(0);
    });
  });
});
