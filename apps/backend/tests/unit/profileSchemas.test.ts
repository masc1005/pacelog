import { describe, it, expect } from 'vitest';
import {
  updateProfileSchema,
  updateSportsSchema,
  onboardingSchema,
} from '../../src/modules/profile/profile.schemas.js';

describe('Profile Zod Schemas Unit Tests', () => {
  describe('updateProfileSchema', () => {
    it('deve validar payload correto de atualização de perfil', () => {
      const validPayload = {
        name: 'Leoni Mascarenhas',
        bio: 'Triatleta e Desenvolvedor',
        unitSystem: 'metric',
        timezone: 'America/Sao_Paulo',
        firstDayOfWeek: 1,
        weeklySessionGoal: 5,
        theme: 'dark',
        streakEnabled: true,
        aiInsightsEnabled: true,
        primarySportKey: 'running',
        heightCm: 178.5,
        biologicalSex: 'male',
        birthDate: '1995-06-15',
      };

      const result = updateProfileSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome menor que 2 caracteres', () => {
      const invalidPayload = {
        name: 'A',
      };

      const result = updateProfileSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar firstDayOfWeek inválido', () => {
      const invalidPayload = {
        firstDayOfWeek: 3,
      };

      const result = updateProfileSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar heightCm fora do intervalo (100 a 250)', () => {
      expect(updateProfileSchema.safeParse({ heightCm: 99 }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ heightCm: 251 }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ heightCm: 175 }).success).toBe(true);
    });

    it('deve validar biologicalSex e birthDate', () => {
      expect(updateProfileSchema.safeParse({ biologicalSex: 'female', birthDate: '1998-04-20' }).success).toBe(true);
      expect(updateProfileSchema.safeParse({ biologicalSex: 'other' }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ birthDate: '20/04/1998' }).success).toBe(false);
    });
  });

  describe('updateSportsSchema', () => {
    it('deve aceitar lista válida de esportes ativos', () => {
      const validPayload = {
        activeSports: ['running', 'boxing', 'strength'],
        primarySportKey: 'running',
      };

      const result = updateSportsSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar lista vazia de esportes ativos', () => {
      const invalidPayload = {
        activeSports: [],
      };

      const result = updateSportsSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar esporte inexistente na lista', () => {
      const invalidPayload = {
        activeSports: ['running', 'padel'], // padel não é suportado oficialmente no enum
      };

      const result = updateSportsSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('onboardingSchema', () => {
    it('deve validar payload completo de onboarding', () => {
      const validPayload = {
        name: 'Atleta Pro',
        activeSports: ['running', 'football'],
        primarySportKey: 'running',
        weeklySessionGoal: 4,
        unitSystem: 'metric',
        heightCm: 180,
        biologicalSex: 'male',
        birthDate: '1994-03-10',
      };

      const result = onboardingSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar onboarding sem nome', () => {
      const invalidPayload = {
        activeSports: ['running'],
        primarySportKey: 'running',
      };

      const result = onboardingSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
