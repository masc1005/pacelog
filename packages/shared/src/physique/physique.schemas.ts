import { z } from 'zod';
import { MUSCLE_GROUPS } from '../exercises/exercise.enums.js';

export const STANDARD_PHYSIQUE_ANGLES = ['front', 'back', 'side'] as const;

export const BODYBUILDING_POSES = [
  'front_double_biceps',
  'side_chest',
  'back_double_biceps',
  'side_triceps',
  'abs_and_thighs',
] as const;

export const PHYSIQUE_CAPTURE_SLOTS = [
  ...STANDARD_PHYSIQUE_ANGLES,
  ...BODYBUILDING_POSES,
] as const;

export const StandardPhysiqueAngleEnum = z.enum(STANDARD_PHYSIQUE_ANGLES);
export const BodybuildingPoseEnum = z.enum(BODYBUILDING_POSES);
export const PhysiqueCaptureSlotEnum = z.enum(PHYSIQUE_CAPTURE_SLOTS);

export const PHYSIQUE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/webp'] as const;

export const PHYSIQUE_ASSESSMENT_GOALS = [
  'hypertrophy',
  'definition',
  'recomposition',
  'classic_physique',
  'mens_physique',
  'bodybuilding',
] as const;

export const BIOLOGICAL_SEX_VALUES = ['male', 'female'] as const;

export const PHYSIQUE_IMAGE_REJECTION_REASONS = [
  'clothing_obscured',
  'poor_lighting_or_blur',
  'bad_framing',
  'wrong_pose',
] as const;

export const GENERATE_PHYSIQUE_PLAN_MODES = ['create_new', 'adapt_existing'] as const;

export const PhysiquePoseInputSchema = z.object({
  poseType: PhysiqueCaptureSlotEnum,
  base64: z.string().min(10, 'Imagem em base64 inválida'),
  mimeType: z.enum(PHYSIQUE_IMAGE_MIME_TYPES),
});

export const CreatePhysiqueAssessmentInputSchema = z
  .object({
    poses: z
      .array(PhysiquePoseInputSchema)
      .min(1, 'Envie pelo menos 1 foto ou pose para avaliação')
      .max(8, 'Envie no máximo 8 imagens (até 3 ângulos naturais + 5 poses)'),
    heightCm: z
      .number()
      .min(100, 'Altura mínima é 100 cm')
      .max(250, 'Altura máxima é 250 cm'),
    weightKg: z
      .number()
      .min(30, 'Peso mínimo é 30 kg')
      .max(300, 'Peso máximo é 300 kg'),
    biologicalSex: z.enum(BIOLOGICAL_SEX_VALUES),
    age: z.number().int().min(14, 'Idade mínima é 14 anos').max(110, 'Idade máxima é 110 anos'),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida (YYYY-MM-DD)')
      .optional(),
    goal: z.enum(PHYSIQUE_ASSESSMENT_GOALS),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.poses.forEach((p, idx) => {
      if (seen.has(p.poseType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['poses', idx, 'poseType'],
          message: `Ângulo/pose duplicado não permitido: ${p.poseType}`,
        });
      }
      seen.add(p.poseType);
    });
  });

export const PhysiqueImageQualityCheckSchema = z.object({
  isAssessable: z.boolean(),
  rejectionReason: z.enum(PHYSIQUE_IMAGE_REJECTION_REASONS).optional(),
  userFeedback: z.string().optional(),
});

export const PhysiqueComparisonWithPreviousSchema = z.object({
  daysSinceLast: z.number().int().min(0),
  weightDeltaKg: z.number(),
  conditioningEvolutionNote: z.string().min(1),
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
  vTaperVisualScore: z.number().min(0).max(100),
  overallSymmetryScore: z.number().min(0).max(100),
});

export const PhysiquePoseBreakdownItemSchema = z.object({
  poseType: PhysiqueCaptureSlotEnum,
  muscularAnalysis: z.string().min(1),
  posingExecutionTip: z.string().min(1),
});

export const PhysiqueStrongPointSchema = z.object({
  muscleGroup: z.enum(MUSCLE_GROUPS),
  note: z.string().min(1),
});

export const PhysiqueWeakPointSchema = z.object({
  muscleGroup: z.enum(MUSCLE_GROUPS),
  subRegion: z.string().min(1),
  priority: z.enum(['high', 'medium']),
  detectedInPoses: z.array(PhysiqueCaptureSlotEnum).default([]),
  technicalReason: z.string().min(1),
  targetWeeklySets: z.number().int().min(4).max(30),
  recommendedExerciseNames: z.array(z.string().min(1)).min(1),
});

export const PhysiqueAssessmentResultSchema = z
  .object({
    imageQualityCheck: PhysiqueImageQualityCheckSchema,
    spatialCalibration: SpatialCalibrationSchema,
    anthropometryEstimate: AnthropometryEstimateSchema,
    poseBreakdown: z.array(PhysiquePoseBreakdownItemSchema).default([]),
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
