import { FilterQuery, Types } from 'mongoose';

/**
 * Garante o isolamento estrito de dados por usuário em bancos sem RLS (como MongoDB).
 * Toda query de domínio DEVE passar por este helper.
 */
export function scopedFilter<T>(
  userId: Types.ObjectId | string,
  filter: FilterQuery<T> = {}
): FilterQuery<T> {
  if (!userId) {
    throw new Error('scopedFilter: userId é obrigatório para consultas de domínio');
  }
  return { ...filter, userId } as FilterQuery<T>;
}
