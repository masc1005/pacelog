import { z } from 'zod';
import { MUSCLE_GROUPS } from '../exercises/exercise.enums.js';

export const PHYSIQUE_PHOTO_ANGLES = ['front', 'back', 'side'] as const;
export const PHYSIQUE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/webp'] as const;
export const PHYSIQUE_ASSESSMENT_GOALS = [
  'hypertrophy',
  'definition',
  'recomposition',
  'athletic',
] as const;
export const BIOLOGICAL_SEX_VALUES = ['male', 'female'] as const;
export const PHYSIQUE_IMAGE_REJECTION_REASONS = [
  'clothing_obscured',
  'poor_lighting_or_blur',
  'bad_framing',
  'no_person_detected',
] as const;
export const GENERATE_PHYSIQUE_PLAN_MODES = ['create_new', 'adapt_existing'] as const;

export const PhysiqueImageInputSchema = z.object({
  angle: z.enum(PHYSIQUE_PHOTO_ANGLES),
  base64: z.string().min(10, 'Imagem em base64 inválida'),
  mimeType: z.enum(PHYSIQUE_IMAGE_MIME_TYPES),
});

export const CreatePhysiqueAssessmentInputSchema = z.object({
  images: z
    .array(PhysiqueImageInputSchema)
    .min(1, 'Envie pelo menos 1 foto para avaliação')
    .max(3, 'Envie no máximo 3 fotos (frente, costas, perfil)'),
  heightCm: z
    .number()
    .min(100, 'Altura mínima é 100 cm')
    .max(250, 'Altura máxima é 250 cm'),
  weightKg: z
    .number()
    .min(30, 'Peso mínimo é 30 kg')
    .max(300, 'Peso máximo é 300 kg'),
  goal: z.enum(PHYSIQUE_ASSESSMENT_GOALS),
  biologicalSex: z.enum(BIOLOGICAL_SEX_VALUES).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida (YYYY-MM-DD)')
    .optional(),
  age: z.number().int().min(14).max(110).optional(),
});

export const PhysiqueImageQualityCheckSchema = z.object({
  isAssessable: z.boolean(),
  rejectionReason: z.enum(PHYSIQUE_IMAGE_REJECTION_REASONS).optional(),
  userFeedback: z.string().optional(),
});

export const PhysiqueComparisonWithPreviousSchema = z.object({
  daysSinceLast: z.number().int().min(0),
  weightDeltaKg: z.number(),
  bodyFatDeltaNote: z.string().min(1),
  weakPointsProgress: z.string().min(1),
});

export const SpatialCalibrationSchema = z.object({
  detectedReferenceObjects: z.array(z.string()).default([]),
  perspectiveDistortionNote: z.string().min(1),
  calibrationConfidence: z.enum(['high', 'medium', 'low']),
});

export const AnthropometryEstimateSchema = z.object({
  bmi: z.number().positive(),
  estimatedBodyFatRange: z.object({
    min: z.number().min(3).max(60),
    max: z.number().min(3).max(65),
  }),
  waistToShoulderVisualRatio: z.string().min(1),
});

export const PhysiqueStrongPointSchema = z.object({
  muscleGroup: z.enum(MUSCLE_GROUPS),
  note: z.string().min(1),
});

export const PhysiqueWeakPointSchema = z.object({
  muscleGroup: z.enum(MUSCLE_GROUPS),
  priority: z.enum(['high', 'medium']),
  technicalReason: z.string().min(1),
  targetWeeklySets: z.number().int().min(4).max(30),
  recommendedExerciseNames: z.array(z.string().min(1)).min(1),
});

export const PhysiqueAssessmentResultSchema = z
  .object({
    imageQualityCheck: PhysiqueImageQualityCheckSchema,
    spatialCalibration: SpatialCalibrationSchema,
    anthropometryEstimate: AnthropometryEstimateSchema,
    physiqueSummary: z.string().min(1),
    strongPoints: z.array(PhysiqueStrongPointSchema).default([]),
    weakPoints: z.array(PhysiqueWeakPointSchema).default([]),
    posturalObservations: z.array(z.string()).default([]),
    recommendedSplit: z.string().min(1),
    comparisonWithPrevious: PhysiqueComparisonWithPreviousSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.imageQualityCheck.isAssessable && data.weakPoints.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weakPoints'],
        message: 'Pelo menos 1 ponto fraco é obrigatório quando a imagem é avaliável.',
      });
    }
  });

export const GeneratePhysiquePlanInputSchema = z.object({
  availableStrengthDays: z.number().int().min(1).max(6).default(3),
  mode: z.enum(GENERATE_PHYSIQUE_PLAN_MODES).default('create_new'),
});

export type CreatePhysiqueAssessmentInputParsed = z.infer<
  typeof CreatePhysiqueAssessmentInputSchema
>;
export type PhysiqueAssessmentResultParsed = z.infer<
  typeof PhysiqueAssessmentResultSchema
>;
export type GeneratePhysiquePlanInputParsed = z.infer<
  typeof GeneratePhysiquePlanInputSchema
>;
