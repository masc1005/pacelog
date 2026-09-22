import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TOKEN_KEY,
  USER_CACHE_KEY,
  cacheUser,
  getCachedUser,
  clearUserCache,
  persistToken,
  type AuthUser,
} from './AuthContext';

describe('AuthContext Offline & Cache Helpers', () => {
  const mockUser: AuthUser = {
    id: 'user_tactical_123',
    name: 'Atleta PaceLog',
    email: 'atleta@pacelog.app',
    image: null,
    emailVerified: true,
  };

  const storageMap = new Map<string, string>();
  const localStorageMock: Storage = {
    getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storageMap.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      storageMap.delete(key);
    }),
    clear: vi.fn(() => {
      storageMap.clear();
    }),
    key: vi.fn((i: number) => Array.from(storageMap.keys())[i] ?? null),
    get length() {
      return storageMap.size;
    },
  };

  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deve ter as chaves de storage corretas de acordo com a arquitetura', () => {
    expect(TOKEN_KEY).toBe('pacelog_auth_token');
    expect(USER_CACHE_KEY).toBe('pacelog_user_cache');
  });

  describe('cacheUser & getCachedUser', () => {
    it('deve salvar e recuperar o usuário autenticado do localStorage', () => {
      expect(getCachedUser()).toBeNull();

      cacheUser(mockUser);

      const cached = getCachedUser();
      expect(cached).toEqual(mockUser);
      expect(cached?.id).toBe('user_tactical_123');
      expect(cached?.email).toBe('atleta@pacelog.app');
    });

    it('deve retornar null se o conteúdo do localStorage estiver corrompido', () => {
      storageMap.set(USER_CACHE_KEY, 'invalid-json{{{');
      expect(getCachedUser()).toBeNull();
    });

    it('não deve lançar erro se localStorage.setItem falhar (ex: quota excedida)', () => {
      vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => cacheUser(mockUser)).not.toThrow();
    });
  });

  describe('persistToken', () => {
    it('deve persistir token direto de resData.token', () => {
      persistToken({ token: 'bearer-token-direct' });
      expect(storageMap.get(TOKEN_KEY)).toBe('bearer-token-direct');
    });

    it('deve persistir token a partir de resData.session.token', () => {
      persistToken({ session: { token: 'session-bearer-123' } });
      expect(storageMap.get(TOKEN_KEY)).toBe('session-bearer-123');
    });

    it('deve persistir session.id como fallback de token', () => {
      persistToken({ session: { id: 'sess_abc456' } });
      expect(storageMap.get(TOKEN_KEY)).toBe('sess_abc456');
    });

    it('deve salvar "active" se nenhum token explícito for retornado', () => {
      persistToken({});
      expect(storageMap.get(TOKEN_KEY)).toBe('active');
    });
  });

  describe('clearUserCache', () => {
    it('deve remover tanto USER_CACHE_KEY quanto TOKEN_KEY do localStorage', () => {
      cacheUser(mockUser);
      persistToken({ token: 'active-session-token' });

      expect(storageMap.get(USER_CACHE_KEY)).toBeDefined();
      expect(storageMap.get(TOKEN_KEY)).toBeDefined();

      clearUserCache();

      expect(storageMap.get(USER_CACHE_KEY)).toBeUndefined();
      expect(storageMap.get(TOKEN_KEY)).toBeUndefined();
      expect(getCachedUser()).toBeNull();
    });
  });
});
