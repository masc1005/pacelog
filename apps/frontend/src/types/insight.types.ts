import { SportKey } from './sport.types.js';

export type InsightType =
  | 'evolution'
  | 'consistency'
  | 'attention'
  | 'achievement'
  | 'reflection';

export interface Insight {
  id: string;
  sportKey?: SportKey;
  type: InsightType;
  title: string;
  summary: string;
  evidence: any[];
  confidence: 'low' | 'medium' | 'high';
  period: string;
  disclaimer?: string;
  model?: string;
  usefulFeedback?: boolean | null;
  createdAt: string;
}
