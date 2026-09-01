/**
 * Cache Redis — Upstash via SDK REST (@upstash/redis)
 *
 * Estratégia:
 * - Se UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN estiverem configurados,
 *   usa Upstash Redis via HTTP (sem conexão TCP persistente — ideal para Railway)
 * - Se não estiverem (dev local, testes), usa um Map em memória
 *   com interface compatível — zero mudança nos callers
 *
 * TTLs:
 *   - Catálogo de exercícios (sistema):  60 min  (dado estático)
 *   - Catálogo de exercícios (usuário):  10 min  (pode mudar ao criar custom)
 */
import { Redis } from '@upstash/redis';

// ──────────────────────────────────────────────────────────────────────────────
// Interface comum entre Upstash real e fallback em memória
// ──────────────────────────────────────────────────────────────────────────────
export interface ICache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<any>;
  del(key: string): Promise<any>;
  keys(pattern: string): Promise<string[]>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fallback em memória — dev / testes sem Upstash configurado
// ──────────────────────────────────────────────────────────────────────────────
class InMemoryCache implements ICache {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, options: { ex: number }): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + options.ex * 1000 });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    this.store.delete(key);
    return 1;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.store.keys()].filter((k) => regex.test(k));
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Wrapper Upstash — adapta interface da SDK ao ICache
// ──────────────────────────────────────────────────────────────────────────────
class UpstashCache implements ICache {
  private client: Redis;

  constructor(url: string, token: string) {
    this.client = new Redis({ url, token });
    console.info('[cache] Upstash Redis REST configurado.');
  }

  async get(key: string): Promise<string | null> {
    try {
      const val = await this.client.get<string>(key);
      return val ?? null;
    } catch (err) {
      console.warn('[cache] get falhou:', (err as Error).message);
      return null;
    }
  }

  async set(key: string, value: string, options: { ex: number }): Promise<any> {
    try {
      return await this.client.set(key, value, { ex: options.ex });
    } catch (err) {
      console.warn('[cache] set falhou:', (err as Error).message);
      return null;
    }
  }

  async del(key: string): Promise<any> {
    try {
      return await this.client.del(key);
    } catch (err) {
      console.warn('[cache] del falhou:', (err as Error).message);
      return null;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (err) {
      console.warn('[cache] keys falhou:', (err as Error).message);
      return [];
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Exportação — Upstash real ou fallback em memória
// ──────────────────────────────────────────────────────────────────────────────
function createCache(): ICache {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.info(
      '[cache] UPSTASH_REDIS_REST_URL/TOKEN não configurados — usando cache em memória (in-process).'
    );
    return new InMemoryCache();
  }

  return new UpstashCache(url, token);
}

export const cache = createCache();
