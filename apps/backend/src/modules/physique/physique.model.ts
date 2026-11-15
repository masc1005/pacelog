import mongoose, { Schema, type Document } from 'mongoose';
import {
  BIOLOGICAL_SEX_VALUES,
  BODYBUILDING_POSES,
  MUSCLE_GROUPS,
  PHYSIQUE_ASSESSMENT_GOALS,
  PHYSIQUE_IMAGE_REJECTION_REASONS,
  type BiologicalSex,
  type PhysiqueAssessmentGoal,
  type PhysiqueAssessmentResult,
} from '@pacelog/shared';

export interface IPhysiqueAssessmentDocument extends Document {
  userId: string;
  heightCm: number;
  weightKg: number;
  goal: PhysiqueAssessmentGoal;
  biologicalSex: BiologicalSex;
  age: number;
  result: PhysiqueAssessmentResult;
  modelUsed?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PoseBreakdownSubSchema = new Schema(
  {
    poseType: { type: String, enum: BODYBUILDING_POSES, required: true },
    muscularAnalysis: { type: String, required: true },
    posingExecutionTip: { type: String, required: true },
  },
  { _id: false }
);

const StrongPointSchema = new Schema(
  {
    muscleGroup: { type: String, enum: MUSCLE_GROUPS, required: true },
    note: { type: String, required: true },
  },
  { _id: false }
);

const WeakPointSchema = new Schema(
  {
    muscleGroup: { type: String, enum: MUSCLE_GROUPS, required: true },
    subRegion: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium'], required: true },
    detectedInPoses: { type: [String], enum: BODYBUILDING_POSES, default: [] },
    technicalReason: { type: String, required: true },
    targetWeeklySets: { type: Number, required: true, min: 4, max: 30 },
    recommendedExerciseNames: { type: [String], required: true },
  },
  { _id: false }
);

const ImageQualityCheckSubSchema = new Schema(
  {
    isAssessable: { type: Boolean, required: true, default: true },
    rejectionReason: { type: String, enum: PHYSIQUE_IMAGE_REJECTION_REASONS },
    userFeedback: { type: String },
  },
  { _id: false }
);

const ComparisonWithPreviousSubSchema = new Schema(
  {
    daysSinceLast: { type: Number, required: true, min: 0 },
    weightDeltaKg: { type: Number, required: true },
    conditioningEvolutionNote: { type: String, required: true },
    weakPointsProgress: { type: String, required: true },
  },
  { _id: false }
);

const PhysiqueResultSubSchema = new Schema(
  {
    imageQualityCheck: {
      type: ImageQualityCheckSubSchema,
      required: true,
      default: () => ({ isAssessable: true }),
    },
    spatialCalibration: {
      detectedReferenceObjects: { type: [String], default: [] },
      perspectiveDistortionNote: { type: String, required: true },
      calibrationConfidence: {
        type: String,
        enum: ['high', 'medium', 'low'],
        required: true,
      },
    },
    anthropometryEstimate: {
      bmi: { type: Number, required: true },
      estimatedBodyFatRange: {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
      },
      vTaperVisualScore: { type: Number, required: true, min: 0, max: 100 },
      overallSymmetryScore: { type: Number, required: true, min: 0, max: 100 },
    },
    poseBreakdown: { type: [PoseBreakdownSubSchema], default: [] },
    physiqueSummary: { type: String, required: true },
    strongPoints: { type: [StrongPointSchema], default: [] },
    weakPoints: { type: [WeakPointSchema], default: [] },
    posturalObservations: { type: [String], default: [] },
    recommendedSplit: { type: String, required: true },
    comparisonWithPrevious: {
      type: ComparisonWithPreviousSubSchema,
      required: false,
    },
  },
  { _id: false }
);

// ATENÇÃO: Nunca armazenar poses/base64 ou buffers de imagens neste schema (processamento 100% efêmero)
const PhysiqueAssessmentSchema = new Schema<IPhysiqueAssessmentDocument>(
  {
    userId: { type: String, required: true, index: true },
    heightCm: { type: Number, required: true, min: 100, max: 250 },
    weightKg: { type: Number, required: true, min: 30, max: 300 },
    goal: { type: String, enum: PHYSIQUE_ASSESSMENT_GOALS, required: true },
    biologicalSex: { type: String, enum: BIOLOGICAL_SEX_VALUES, required: true },
    age: { type: Number, required: true, min: 14, max: 110 },
    result: { type: PhysiqueResultSubSchema, required: true },
    modelUsed: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

PhysiqueAssessmentSchema.index({ userId: 1, createdAt: -1 });

export const PhysiqueAssessmentModel = mongoose.model<IPhysiqueAssessmentDocument>(
  'PhysiqueAssessment',
  PhysiqueAssessmentSchema
);
