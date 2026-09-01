import type { Exercise } from '@pacelog/shared';
import { strengthApi } from '../../../services/strength.api';

const CACHE_KEY = 'pacelog_exercise_library_cache';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

interface ExerciseCachePayload {
  data: Exercise[];
  fetchedAt: number;
}

let inMemoryLibrary: Exercise[] | null = null;
let lastFetchedAt = 0;
let inflightRequest: Promise<Exercise[]> | null = null;

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Carrega a biblioteca de exercícios do LocalStorage na inicialização.
 */
function loadFromStorage(): { data: Exercise[]; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExerciseCachePayload;
  } catch {
    return null;
  }
}

/**
 * Salva a biblioteca no LocalStorage.
 */
function saveToStorage(data: Exercise[], fetchedAt: number): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, fetchedAt } as ExerciseCachePayload)
    );
  } catch {
    // quota exceeded ou private mode silencioso
  }
}

/**
 * Recupera toda a biblioteca de exercícios com estratégia stale-while-revalidate.
 */
export async function getExerciseLibrary(forceRefresh = false): Promise<Exercise[]> {
  const now = Date.now();

  // 1. Checa memória
  if (inMemoryLibrary && !forceRefresh && now - lastFetchedAt < CACHE_TTL_MS) {
    return inMemoryLibrary;
  }

  // 2. Checa storage
  if (!inMemoryLibrary) {
    const cached = loadFromStorage();
    if (cached && cached.data?.length > 0) {
      inMemoryLibrary = cached.data;
      lastFetchedAt = cached.fetchedAt;

      // Se o cache ainda estiver fresco, devolve imediatamente
      if (!forceRefresh && now - cached.fetchedAt < CACHE_TTL_MS) {
        return inMemoryLibrary;
      }
    }
  }

  // Se já há uma requisição em voo, reaproveita a Promise para evitar rajadas de rede
  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      // Busca até 200 exercícios do sistema e do usuário para compor o catálogo local
      const res = await strengthApi.searchExercises({ limit: 200 });
      const items = res.items || [];
      if (items.length > 0) {
        inMemoryLibrary = items;
        lastFetchedAt = Date.now();
        saveToStorage(items, lastFetchedAt);
      }
      return inMemoryLibrary || items;
    } catch (err) {
      // Se falhar e tivermos cache antigo, retorna o cache antigo como fallback
      if (inMemoryLibrary && inMemoryLibrary.length > 0) {
        return inMemoryLibrary;
      }
      throw err;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

/**
 * Filtra exercícios em memória de forma instantânea (<10ms).
 */
export function searchCachedExercises(
  query: string,
  muscleGroup: string = '',
  library: Exercise[] = inMemoryLibrary || []
): Exercise[] {
  const normalizedQuery = normalize(query);

  return library.filter((ex) => {
    // Filtro por grupo muscular
    if (muscleGroup && ex.primaryMuscleGroup !== muscleGroup) {
      return false;
    }

    // Se não há texto de busca, passa
    if (!normalizedQuery) {
      return true;
    }

    // Busca no nome principal
    if (normalize(ex.name).includes(normalizedQuery)) {
      return true;
    }

    // Busca em nomes alternativos/apelidos
    if (
      ex.nameAlternatives &&
      ex.nameAlternatives.some((alt) => normalize(alt).includes(normalizedQuery))
    ) {
      return true;
    }

    // Busca em equipamento
    if (ex.equipment && normalize(ex.equipment).includes(normalizedQuery)) {
      return true;
    }

    return false;
  });
}

/**
 * Invalida o cache de exercícios (usado após criação de novo exercício customizado).
 */
export function invalidateExerciseCache(): void {
  inMemoryLibrary = null;
  lastFetchedAt = 0;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
