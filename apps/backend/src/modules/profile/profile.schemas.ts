import { z } from 'zod';
import { SPORT_KEYS } from '@pacelog/shared';

const sportKeyEnum = z.enum(SPORT_KEYS);

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url('URL de avatar inválida').optional().or(z.literal('')),
  unitSystem: z.enum(['metric', 'imperial']).optional(),
  timezone: z.string().min(2).max(50).optional(),
  firstDayOfWeek: z.union([z.literal(0), z.literal(1)]).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  weeklySessionGoal: z.number().int().min(0).max(50).optional(),
  streakEnabled: z.boolean().optional(),
  aiInsightsEnabled: z.boolean().optional(),
  primarySportKey: sportKeyEnum.optional(),
});

export const updateSportsSchema = z.object({
  activeSports: z
    .array(sportKeyEnum)
    .min(1, 'Selecione pelo menos 1 esporte ativo'),
  primarySportKey: sportKeyEnum.optional(),
});

export const onboardingSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  activeSports: z
    .array(sportKeyEnum)
    .min(1, 'Selecione pelo menos 1 esporte'),
  primarySportKey: sportKeyEnum,
  weeklySessionGoal: z.number().int().min(1).max(30).default(4),
  unitSystem: z.enum(['metric', 'imperial']).default('metric'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSportsInput = z.infer<typeof updateSportsSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
