import { useCallback, useEffect, useState } from 'react';
import type { InjuryDTO, InjuryStatus, CreateInjuryInput, UpdateInjuryInput } from '@pacelog/shared';
import { injuryApi } from '../../../services/injury.api';
import { enqueueOperation } from '../../../pwa/services/syncQueue.service';
import { useAuth } from '../../../contexts/AuthContext';

export function useInjuries(initialStatus?: InjuryStatus) {
  const { user } = useAuth();
  const [injuries, setInjuries] = useState<InjuryDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setInjuries(await injuryApi.list(initialStatus));
    } finally {
      setLoading(false);
    }
  }, [initialStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (payload: CreateInjuryInput) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!user?.id) throw new Error('Sessão offline sem usuário identificado.');
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: InjuryDTO = {
        id,
        ...payload,
        status: 'active',
        occurredAt: payload.occurredAt ?? now,
        history: [{ severity: payload.severity, status: 'active', recordedAt: now }],
        createdAt: now,
        updatedAt: now,
      };
      await enqueueOperation('create_injury', payload as unknown as Record<string, unknown>, {
        userId: user.id,
        clientUuid: id,
        entityTable: 'injuries',
        apiEndpoint: '/api/injuries',
        method: 'POST',
      });
      setInjuries((current) => [optimistic, ...current]);
      return optimistic;
    }
    const created = await injuryApi.create(payload);
    setInjuries((current) => [created, ...current]);
    return created;
  }, [user?.id]);

  const update = useCallback(async (id: string, payload: UpdateInjuryInput) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!user?.id) throw new Error('Sessão offline sem usuário identificado.');
      await enqueueOperation('update_injury', payload as unknown as Record<string, unknown>, {
        userId: user.id,
        clientUuid: id,
        entityTable: 'injuries',
        apiEndpoint: `/api/injuries/${id}`,
        method: 'PATCH',
      });
      setInjuries((current) => current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...payload,
              resolvedAt: payload.resolvedAt ?? item.resolvedAt,
              updatedAt: new Date().toISOString(),
            }
          : item
      ));
      return;
    }
    const updated = await injuryApi.update(id, payload);
    setInjuries((current) => current.map((item) => item.id === id ? updated : item));
  }, [user?.id]);

  const remove = useCallback(async (id: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!user?.id) throw new Error('Sessão offline sem usuário identificado.');
      await enqueueOperation('delete_injury', {}, {
        userId: user.id,
        clientUuid: id,
        entityTable: 'injuries',
        apiEndpoint: `/api/injuries/${id}`,
        method: 'DELETE',
      });
    } else {
      await injuryApi.remove(id);
    }
    setInjuries((current) => current.filter((item) => item.id !== id));
  }, [user?.id]);

  return { injuries, loading, refresh, create, update, remove };
}
