export const MUSCLE_GROUPS = [
  'peito',
  'costas',
  'ombros',
  'biceps',
  'triceps',
  'quadriceps',
  'posteriores',
  'gluteos',
  'panturrilhas',
  'abdomen',
  'corpo_inteiro',
  'mobilidade',
  'cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  'barra',
  'halteres',
  'maquina',
  'cabo',
  'peso_corporal',
  'kettlebell',
  'elastico',
  'smith',
  'outro',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EXERCISE_TYPES = [
  'compound',
  'isolation',
  'cardio',
  'mobility',
  'other',
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
