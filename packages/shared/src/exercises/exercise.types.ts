import type { MuscleGroup, EquipmentType, ExerciseType } from './exercise.enums.js';

export type Exercise = {
  /** Chave única e estável do exercício. Não muda mesmo se o nome for editado. */
  key: string;
  name: string;
  nameAlternatives?: string[];
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment: EquipmentType;
  type: ExerciseType;
  /** true = exercício criado pelo sistema, false = personalizado pelo usuário */
  isSystem: boolean;
  /** ID do usuário proprietário (null para exercícios do sistema) */
  ownerId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseSearchParams = {
  query?: string;
  muscleGroup?: MuscleGroup;
  equipment?: EquipmentType;
  type?: ExerciseType;
  /** Incluir apenas exercícios recentes (usados nas últimas sessões) */
  recent?: boolean;
  /** Incluir apenas exercícios favoritos */
  favorites?: boolean;
  page?: number;
  limit?: number;
};

export type ExerciseListResult = {
  items: Exercise[];
  recent?: Exercise[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export type CreateCustomExerciseInput = {
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment: EquipmentType;
  type?: ExerciseType;
};
