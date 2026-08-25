import { z } from 'zod';

export const createShoeSchema = z.object({
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().min(1, 'Modelo é obrigatório').max(120),
  nickname: z.string().trim().max(80).optional(),
  color: z.string().trim().max(60).optional(),
  imageUrl: z.string().url('URL da imagem inválida').max(500).optional(),
  purchaseDate: z.string().date('Data de compra inválida').optional(),
  startedUsingAt: z.string().date('Data de início de uso inválida').optional(),
  initialDistanceKm: z.number().min(0).max(100000).default(0),
  distanceLimitKm: z.number().positive().max(100000).optional(),
  isDefault: z.boolean().optional(),
});

export const updateShoeSchema = z.object({
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().min(1, 'Modelo é obrigatório').max(120).optional(),
  nickname: z.string().trim().max(80).optional(),
  color: z.string().trim().max(60).optional(),
  imageUrl: z.string().url('URL da imagem inválida').max(500).optional(),
  purchaseDate: z.string().date('Data de compra inválida').optional(),
  startedUsingAt: z.string().date('Data de início de uso inválida').optional(),
  distanceLimitKm: z.number().positive().max(100000).optional(),
});

export type CreateShoeDTO = z.infer<typeof createShoeSchema>;
export type UpdateShoeDTO = z.infer<typeof updateShoeSchema>;
