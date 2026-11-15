import type { MuscleGroup } from '../exercises/exercise.enums.js';

export type BodybuildingPose =
  | 'front_double_biceps'
  | 'side_chest'
  | 'back_double_biceps'
  | 'side_triceps'
  | 'abs_and_thighs';

export type PhysiqueImageMimeType = 'image/jpeg' | 'image/webp';

export type PhysiqueAssessmentGoal =
  | 'hypertrophy'
  | 'definition'
  | 'recomposition'
  | 'classic_physique'
  | 'mens_physique'
  | 'bodybuilding';

export type CalibrationConfidence = 'high' | 'medium' | 'low';
export type WeakPointPriority = 'high' | 'medium';
export type BiologicalSex = 'male' | 'female';

export type PhysiqueImageRejectionReason =
  | 'clothing_obscured'
  | 'poor_lighting_or_blur'
  | 'bad_framing'
  | 'wrong_pose';

export type GeneratePhysiquePlanMode = 'create_new' | 'adapt_existing';

export interface PhysiquePoseInput {
  poseType: BodybuildingPose;
  base64: string;
  mimeType: PhysiqueImageMimeType;
}

export interface CreatePhysiqueAssessmentInput {
  poses: PhysiquePoseInput[];
  heightCm: number;
  weightKg: number;
  biologicalSex: BiologicalSex;
  age: number;
  birthDate?: string;
  goal: PhysiqueAssessmentGoal;
}

export interface PhysiqueImageQualityCheck {
  isAssessable: boolean;
  rejectionReason?: PhysiqueImageRejectionReason;
  userFeedback?: string;
}

export interface PhysiqueComparisonWithPrevious {
  daysSinceLast: number;
  weightDeltaKg: number;
  conditioningEvolutionNote: string;
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
  vTaperVisualScore: number;
  overallSymmetryScore: number;
}

export interface PhysiquePoseBreakdownItem {
  poseType: BodybuildingPose;
  muscularAnalysis: string;
  posingExecutionTip: string;
}

export interface PhysiqueStrongPoint {
  muscleGroup: MuscleGroup;
  note: string;
}

export interface PhysiqueWeakPoint {
  muscleGroup: MuscleGroup;
  subRegion: string;
  priority: WeakPointPriority;
  detectedInPoses: BodybuildingPose[];
  technicalReason: string;
  targetWeeklySets: number;
  recommendedExerciseNames: string[];
}

export interface PhysiqueAssessmentResult {
  imageQualityCheck: PhysiqueImageQualityCheck;
  spatialCalibration: SpatialCalibration;
  anthropometryEstimate: AnthropometryEstimate;
  poseBreakdown: PhysiquePoseBreakdownItem[];
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
  biologicalSex: BiologicalSex;
  age: number;
  result: PhysiqueAssessmentResult;
  modelUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePhysiquePlanInput {
  availableStrengthDays?: number;
  mode?: GeneratePhysiquePlanMode;
}
