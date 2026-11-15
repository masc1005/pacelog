const DEFAULT_TIMEZONE = 'America/Bahia';

export function resolveValidTimeZone(timezone?: string): string {
  const candidate = timezone?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (year && month && day) {
    return `${year}-${month}-${day}`;
  }

  return date.toISOString().slice(0, 10);
}

function parseUtcDay(str: string): number {
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function subtractDays(dayStr: string, days: number): string {
  const prev = new Date(parseUtcDay(dayStr) - days * 24 * 60 * 60 * 1000);
  return prev.toISOString().slice(0, 10);
}

/**
 * Calcula a sequência de dias ativos (streak) no fuso horário do atleta,
 * respeitando a tolerância de dias de descanso (`streakGraceDays`, padrão 1).
 *
 * Regras:
 * 1. Converte cada sessão para YYYY-MM-DD no `timezone` do atleta (padrão: America/Bahia).
 * 2. Ordena os dias únicos do mais recente para o mais antigo.
 * 3. `maxGap = 1 + Math.max(0, Math.min(3, streakGraceDays))` define a diferença máxima
 *    em dias entre treinos para manter a sequência ativa (ex: grace=0 => treinar hoje ou ontem
 *    e sem falhar dias; grace=1 => permite 1 dia de descanso entre treinos).
 */
export function calculateActiveStreak(
  dates: (Date | string)[],
  referenceDate: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
  streakGraceDays: number = 0
): number {
  if (!dates || dates.length === 0) return 0;

  const tz = resolveValidTimeZone(timezone);
  const grace = Math.max(0, Math.min(3, Math.floor(Number(streakGraceDays) || 0)));
  const maxAllowedDiff = 1 + grace; // diffDays = 1 significa dias consecutivos; grace=1 permite diffDays <= 2 (1 dia off)

  const daySet = new Set<string>();

  for (const item of dates) {
    if (!item) continue;
    const d = typeof item === 'string' ? new Date(item) : item;
    if (isNaN(d.getTime())) continue;

    daySet.add(formatDateInTimeZone(d, tz));
  }

  const sortedDays = Array.from(daySet).sort().reverse();
  if (sortedDays.length === 0) return 0;

  const todayStr = formatDateInTimeZone(referenceDate, tz);
  const validLatestDays = new Set<string>([todayStr]);
  // Sempre aceita pelo menos ontem (para não zerar o streak antes do treino de hoje) + dias de tolerância
  const initialWindow = Math.max(1, maxAllowedDiff);
  for (let d = 1; d <= initialWindow; d++) {
    validLatestDays.add(subtractDays(todayStr, d));
  }

  const startIndex = sortedDays.findIndex((day) => validLatestDays.has(day));
  if (startIndex === -1) {
    return 0;
  }

  let streak = 1;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  for (let i = startIndex; i < sortedDays.length - 1; i++) {
    const currentMs = parseUtcDay(sortedDays[i]);
    const previousMs = parseUtcDay(sortedDays[i + 1]);
    const diffDays = Math.round((currentMs - previousMs) / MS_PER_DAY);

    if (diffDays >= 1 && diffDays <= maxAllowedDiff) {
      streak += 1;
    } else if (diffDays === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}
