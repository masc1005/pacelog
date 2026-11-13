import { z } from 'zod';
import { GEAR_CATEGORIES } from './gear.types.js';

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const gearComponentInputSchema = z.object({
  name: z.string().trim().min(1, 'Nome do componente é obrigatório').max(60),
  distanceLimitKm: z.number().positive().max(100000).optional(),
  /** Km que o componente já tinha rodado antes de ser cadastrado. */
  alreadyUsedKm: z.number().min(0).max(100000).optional(),
});

export const createGearSchema = z.object({
  category: z.enum(GEAR_CATEGORIES).default('running_shoe'),
  brand: optionalText(80),
  model: z.string().trim().min(1, 'Modelo é obrigatório').max(120),
  nickname: optionalText(80),
  color: optionalText(60),
  imageUrl: z.string().url('URL da imagem inválida').max(500).optional(),
  purchaseDate: z.string().date('Data de compra inválida').optional(),
  startedUsingAt: z.string().date('Data de início de uso inválida').optional(),

  initialDistanceKm: z.number().min(0).max(100000).default(0),
  distanceLimitKm: z.number().positive().max(100000).optional(),

  initialRounds: z.number().int().min(0).max(1000000).default(0),
  roundsLimit: z.number().int().positive().max(1000000).optional(),

  initialSessions: z.number().int().min(0).max(1000000).default(0),
  sessionsLimit: z.number().int().positive().max(1000000).optional(),

  /** Componentes iniciais (somente bicicletas). */
  components: z.array(gearComponentInputSchema).max(20).optional(),

  isDefault: z.boolean().optional(),
});

export const updateGearSchema = z.object({
  brand: optionalText(80),
  model: z.string().trim().min(1, 'Modelo é obrigatório').max(120).optional(),
  nickname: optionalText(80),
  color: optionalText(60),
  imageUrl: z.string().url('URL da imagem inválida').max(500).optional(),
  purchaseDate: z.string().date('Data de compra inválida').optional(),
  startedUsingAt: z.string().date('Data de início de uso inválida').optional(),
  distanceLimitKm: z.number().positive().max(100000).optional(),
  roundsLimit: z.number().int().positive().max(1000000).optional(),
  sessionsLimit: z.number().int().positive().max(1000000).optional(),
});

export type GearComponentInput = z.infer<typeof gearComponentInputSchema>;
export type CreateGearDTO = z.infer<typeof createGearSchema>;
export type UpdateGearDTO = z.infer<typeof updateGearSchema>;
