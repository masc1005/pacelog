import { z } from 'zod';
import { SPORT_KEYS } from '@pacelog/shared';

// ==========================================
// SCHEMAS DE MÉTRICAS POR ESPORTE
// ==========================================

export const splitMarkerSchema = z.object({
  km: z.number().positive(),
  splitTimeSeconds: z.number().positive(),
  paceSecondsPerKm: z.number().positive(),
  elevationMeters: z.number().optional(),
});

export const runningMetricsSchema = z.object({
  distanceMeters: z.number().positive('Distância deve ser maior que 0 metros'),
  durationSeconds: z.number().positive('Duração deve ser maior que 0 segundos'),
  paceSecondsPerKm: z.number().positive().optional(),
  elevationGainMeters: z.number().nonnegative().optional(),
  avgHeartRate: z.number().int().min(30).max(250).optional(),
  maxHeartRate: z.number().int().min(30).max(250).optional(),
  cadenceAvg: z.number().int().positive().optional(),
  splits: z.array(splitMarkerSchema).optional(),
  shoesId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const footballMetricsSchema = z.object({
  matchType: z.enum(['futebol_campo', 'society_7', 'futsal', 'treino']),
  durationSeconds: z.number().positive('Duração deve ser maior que 0 segundos'),
  goals: z.number().int().nonnegative().optional().default(0),
  assists: z.number().int().nonnegative().optional().default(0),
  position: z.enum(['goleiro', 'zagueiro', 'lateral', 'meia', 'atacante']).optional(),
  physicalIntensity: z.number().min(1).max(10).optional(),
  matchResult: z.enum(['win', 'loss', 'draw']).optional(),
  distanceEstimatedKm: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

export const futevoleiSetSchema = z.object({
  setNumber: z.number().int().positive(),
  pointsScored: z.number().int().nonnegative(),
  pointsConceded: z.number().int().nonnegative(),
});

export const futevoleiMetricsSchema = z.object({
  setsCount: z.number().int().positive('Número de sets deve ser no mínimo 1'),
  setsWon: z.number().int().nonnegative().optional(),
  setsLost: z.number().int().nonnegative().optional(),
  matches: z.array(futevoleiSetSchema).optional(),
  durationSeconds: z.number().positive('Duração deve ser maior que 0 segundos'),
  aces: z.number().int().nonnegative().optional(),
  attackErrors: z.number().int().nonnegative().optional(),
  successfulReceptions: z.number().int().nonnegative().optional(),
  successfulSets: z.number().int().nonnegative().optional(),
  successfulAttacks: z.number().int().nonnegative().optional(),
  serves: z.number().int().nonnegative().optional(),
  partnerName: z.string().max(100).optional(),
  courtType: z.enum(['sand_beach', 'sand_court']).optional(),
  notes: z.string().max(500).optional(),
});

export const boxingMetricsSchema = z.object({
  roundsCount: z.number().int().positive('Número de rounds deve ser no mínimo 1'),
  roundDurationSeconds: z.number().positive('Duração do round deve ser positiva'),
  restDurationSeconds: z.number().nonnegative('Tempo de descanso não pode ser negativo'),
  totalDurationSeconds: z.number().positive().optional(),
  punchesThrownEstimate: z.number().int().nonnegative().optional(),
  sparring: z.boolean().optional().default(false),
  focusArea: z.enum(['bag_work', 'sparring', 'pad_work', 'technique', 'conditioning']).optional(),
  notes: z.string().max(500).optional(),
});

export const strengthSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive('Repetições devem ser maiores que 0'),
  weightKg: z.number().nonnegative('Carga em kg não pode ser negativa'),
  rpe: z.number().min(1).max(10).optional(),
  isWarmup: z.boolean().optional().default(false),
});

export const strengthExerciseSchema = z.object({
  exerciseName: z.string().min(1, 'Nome do exercício é obrigatório'),
  targetMuscleGroup: z.string().optional(),
  sets: z.array(strengthSetSchema).min(1, 'Cada exercício deve conter ao menos 1 série'),
});

export const strengthMetricsSchema = z.object({
  exercises: z.array(strengthExerciseSchema).min(1, 'Treino de musculação deve ter ao menos 1 exercício'),
  totalVolumeKg: z.number().nonnegative().optional(),
  totalSets: z.number().int().nonnegative().optional(),
  totalReps: z.number().int().nonnegative().optional(),
  durationSeconds: z.number().positive('Duração total deve ser positiva'),
  notes: z.string().max(500).optional(),
});

// ==========================================
// SWIMMING SCHEMAS
// ==========================================

export const swimmingStrokeSchema = z.enum([
  'freestyle',
  'backstroke',
  'breaststroke',
  'butterfly',
  'mixed',
  'drill',
  'other'
]);

export const swimmingSetSchema = z.object({
  setNumber: z.number().int().positive(),
  distanceMeters: z.number().positive(),
  repetitions: z.number().int().positive(),
  stroke: swimmingStrokeSchema,
  durationSeconds: z.number().positive().optional(),
  restSeconds: z.number().nonnegative().optional(),
  targetPaceSecondsPer100m: z.number().positive().optional(),
  averagePaceSecondsPer100m: z.number().positive().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});

export const poolSwimmingMetricsSchema = z.object({
  environment: z.literal('pool'),
  totalDistanceMeters: z.number().positive(),
  poolLengthMeters: z.number().positive().optional(),
  totalLaps: z.number().positive().optional(),
  primaryStroke: swimmingStrokeSchema.optional(),
  paceSecondsPer100m: z.number().positive().optional(),
  averageHeartRate: z.number().int().min(30).max(250).optional(),
  maxHeartRate: z.number().int().min(30).max(250).optional(),
  totalStrokes: z.number().int().positive().optional(),
  swolf: z.number().positive().optional(),
  sets: z.array(swimmingSetSchema).optional(),
});

export const openWaterSwimmingMetricsSchema = z.object({
  environment: z.literal('open_water'),
  totalDistanceMeters: z.number().positive(),
  primaryStroke: swimmingStrokeSchema.optional(),
  paceSecondsPer100m: z.number().positive().optional(),
  averageHeartRate: z.number().int().min(30).max(250).optional(),
  maxHeartRate: z.number().int().min(30).max(250).optional(),
  totalStrokes: z.number().int().positive().optional(),
  swolf: z.number().positive().optional(),
  sets: z.array(swimmingSetSchema).optional(),
});

export const swimmingMetricsSchema = z.discriminatedUnion('environment', [
  poolSwimmingMetricsSchema,
  openWaterSwimmingMetricsSchema,
]);

// ==========================================
// CYCLING SCHEMAS
// ==========================================

export const cyclingTypeSchema = z.enum(['road', 'indoor', 'mountain_bike', 'mixed']);

export const cyclingMetricsSchema = z.object({
  cyclingType: cyclingTypeSchema.default('road'),
  distanceKm: z.number().positive('Distância deve ser maior que 0'),
  durationSeconds: z.number().positive('Duração deve ser positiva').optional(),
  averageSpeedKmh: z.number().nonnegative().optional(),
  paceSecondsPerKm: z.number().nonnegative().optional(),
  elevationGainMeters: z.number().nonnegative().optional(),
  averageHeartRate: z.number().positive().optional(),
  maxHeartRate: z.number().positive().optional(),
  bikeId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ==========================================
// JIU-JITSU SCHEMAS
// ==========================================

export const jiuJitsuTrainingTypeSchema = z.enum([
  'technique',
  'sparring',
  'competition',
  'drilling',
  'seminar',
]);

export const beltRankSchema = z.enum([
  'white',
  'blue',
  'purple',
  'brown',
  'black',
]);

export const jiuJitsuMetricsSchema = z.object({
  trainingType: jiuJitsuTrainingTypeSchema.default('technique'),
  durationSeconds: z.number().positive('Duração deve ser positiva').optional(),
  beltRank: beltRankSchema.optional(),
  beltDegree: z.number().int().min(0).max(4).optional(),
  roundsCount: z.number().int().nonnegative().optional(),
  averageRoundDurationSeconds: z.number().positive().optional(),
  submissionsLanded: z.number().int().nonnegative().optional(),
  submissionsReceived: z.number().int().nonnegative().optional(),
  techniquesFocus: z.array(z.string()).optional(),
  gi: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

// ==========================================
// SCHEMAS DE CRIAÇÃO DISCRIMINADA DE SESSÃO
// ==========================================

const baseSessionFields = {
  clientUuid: z.string().uuid('clientUuid deve ser um UUID v4 válido').optional(),
  startedAt: z.coerce.date().default(() => new Date()),
  endedAt: z.coerce.date().optional(),
  durationSeconds: z.number().positive().optional(), // Pode ser calculado das métricas se omitido
  rpe: z.number().min(1, 'RPE mínimo é 1').max(10, 'RPE máximo é 10'),
  notes: z.string().max(1000).optional(),
};

export const createRunningSessionSchema = z.object({
  sportKey: z.literal('running'),
  ...baseSessionFields,
  metrics: runningMetricsSchema,
});

export const createFootballSessionSchema = z.object({
  sportKey: z.literal('football'),
  ...baseSessionFields,
  metrics: footballMetricsSchema,
});

export const createFutevoleiSessionSchema = z.object({
  sportKey: z.literal('futevolei'),
  ...baseSessionFields,
  metrics: futevoleiMetricsSchema,
});

export const createBoxingSessionSchema = z.object({
  sportKey: z.literal('boxing'),
  ...baseSessionFields,
  metrics: boxingMetricsSchema,
});

export const createStrengthSessionSchema = z.object({
  sportKey: z.literal('strength'),
  ...baseSessionFields,
  metrics: strengthMetricsSchema,
});

export const createSwimmingSessionSchema = z.object({
  sportKey: z.literal('swimming'),
  ...baseSessionFields,
  metrics: swimmingMetricsSchema,
});

export const createCyclingSessionSchema = z.object({
  sportKey: z.literal('cycling'),
  ...baseSessionFields,
  metrics: cyclingMetricsSchema,
});

export const createJiuJitsuSessionSchema = z.object({
  sportKey: z.literal('jiujitsu'),
  ...baseSessionFields,
  metrics: jiuJitsuMetricsSchema,
});

export const createSessionSchema = z.discriminatedUnion('sportKey', [
  createRunningSessionSchema,
  createFootballSessionSchema,
  createFutevoleiSessionSchema,
  createBoxingSessionSchema,
  createStrengthSessionSchema,
  createSwimmingSessionSchema,
  createCyclingSessionSchema,
  createJiuJitsuSessionSchema,
]);

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

// ==========================================
// SCHEMAS DE ATUALIZAÇÃO E CONSULTA
// ==========================================

export const updateSessionSchema = z.object({
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  durationSeconds: z.number().positive().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(1000).optional(),
  metrics: z.record(z.any()).optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const listSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sportKey: z.enum(SPORT_KEYS).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const sessionSummaryQuerySchema = z.object({
  timeframe: z.enum(['week', 'month', 'year', 'all']).default('week'),
});

export type SessionSummaryQuery = z.infer<typeof sessionSummaryQuerySchema>;
