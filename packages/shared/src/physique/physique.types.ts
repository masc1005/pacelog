import type { MuscleGroup } from '../exercises/exercise.enums.js';

export type PhysiquePhotoAngle = 'front' | 'back' | 'side';
export type PhysiqueImageMimeType = 'image/jpeg' | 'image/webp';
export type PhysiqueAssessmentGoal =
  | 'hypertrophy'
  | 'definition'
  | 'recomposition'
  | 'athletic';
export type CalibrationConfidence = 'high' | 'medium' | 'low';
export type WeakPointPriority = 'high' | 'medium';
export type BiologicalSex = 'male' | 'female';
export type PhysiqueImageRejectionReason =
  | 'clothing_obscured'
  | 'poor_lighting_or_blur'
  | 'bad_framing'
  | 'no_person_detected';
export type GeneratePhysiquePlanMode = 'create_new' | 'adapt_existing';

export interface PhysiqueImageInput {
  angle: PhysiquePhotoAngle;
  base64: string;
  mimeType: PhysiqueImageMimeType;
}

export interface CreatePhysiqueAssessmentInput {
  images: PhysiqueImageInput[];
  heightCm: number;
  weightKg: number;
  goal: PhysiqueAssessmentGoal;
  biologicalSex?: BiologicalSex;
  birthDate?: string;
  age?: number;
}

export interface PhysiqueImageQualityCheck {
  isAssessable: boolean;
  rejectionReason?: PhysiqueImageRejectionReason;
  userFeedback?: string;
}

export interface PhysiqueComparisonWithPrevious {
  daysSinceLast: number;
  weightDeltaKg: number;
  bodyFatDeltaNote: string;
  weakPointsProgress: string;
}

export interface SpatialCalibration {
  detectedReferenceObjects: string[];
  perspectiveDistortionNote: string;
  calibrationConfidence: CalibrationConfidence;
}

export interface AnthropometryEstimate {
  bmi: number;
  estimatedBodyFatRange: {
    min: number;
    max: number;
  };
  waistToShoulderVisualRatio: string;
}

export interface PhysiqueStrongPoint {
  muscleGroup: MuscleGroup;
  note: string;
}

export interface PhysiqueWeakPoint {
  muscleGroup: MuscleGroup;
  priority: WeakPointPriority;
  technicalReason: string;
  targetWeeklySets: number;
  recommendedExerciseNames: string[];
}

export interface PhysiqueAssessmentResult {
  imageQualityCheck: PhysiqueImageQualityCheck;
  spatialCalibration: SpatialCalibration;
  anthropometryEstimate: AnthropometryEstimate;
  physiqueSummary: string;
  strongPoints: PhysiqueStrongPoint[];
  weakPoints: PhysiqueWeakPoint[];
  posturalObservations: string[];
  recommendedSplit: string;
  comparisonWithPrevious?: PhysiqueComparisonWithPrevious;
}

export interface PhysiqueAssessmentDTO {
  id: string;
  userId: string;
  heightCm: number;
  weightKg: number;
  goal: PhysiqueAssessmentGoal;
  biologicalSex?: BiologicalSex;
  age?: number;
  result: PhysiqueAssessmentResult;
  modelUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePhysiquePlanInput {
  availableStrengthDays?: number;
  mode?: GeneratePhysiquePlanMode;
}
