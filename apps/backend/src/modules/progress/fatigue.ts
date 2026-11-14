export type FatigueStatus = 'fresh' | 'recovering' | 'fatigued';

export function applyFatigueDecay(score: number, elapsedHours: number): number {
  if (score <= 0) return 0;
  return score * Math.pow(0.5, Math.max(0, elapsedHours) / 24);
}

export function classifyFatigue(score: number): FatigueStatus {
  if (score >= 60) return 'fatigued';
  if (score >= 30) return 'recovering';
  return 'fresh';
}

export function shouldRecommendDeload(indicators: boolean[]): boolean {
  return indicators.filter(Boolean).length >= 2;
}
