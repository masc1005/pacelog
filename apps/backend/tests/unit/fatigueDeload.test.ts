import { describe, expect, it } from 'vitest';
import {
  applyFatigueDecay,
  classifyFatigue,
  shouldRecommendDeload,
} from '../../src/modules/progress/fatigue.js';

describe('muscle fatigue and deload rules', () => {
  it('applies half-life decay every 24 hours', () => {
    expect(applyFatigueDecay(80, 0)).toBe(80);
    expect(applyFatigueDecay(80, 24)).toBe(40);
    expect(applyFatigueDecay(80, 48)).toBe(20);
  });

  it('classifies recovery bands consistently', () => {
    expect(classifyFatigue(20)).toBe('fresh');
    expect(classifyFatigue(45)).toBe('recovering');
    expect(classifyFatigue(75)).toBe('fatigued');
  });

  it('requires at least two physiological indicators for deload', () => {
    expect(shouldRecommendDeload([true, false, false])).toBe(false);
    expect(shouldRecommendDeload([true, true, false])).toBe(true);
  });
});
