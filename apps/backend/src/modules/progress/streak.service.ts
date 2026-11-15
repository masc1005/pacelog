const DEFAULT_TIMEZONE = 'America/Bahia';

function resolveValidTimeZone(timezone?: string): string {
  const candidate = timezone?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
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

function subtractOneDay(dayStr: string): string {
  const prev = new Date(parseUtcDay(dayStr) - 24 * 60 * 60 * 1000);
  return prev.toISOString().slice(0, 10);
}

/**
 * Calcula a sequência de dias consecutivos ativos (streak) no fuso horário do atleta.
 *
 * Regras:
 * 1. Converte cada sessão para YYYY-MM-DD no `timezone` do atleta (padrão: America/Bahia).
 * 2. Ordena os dias únicos do mais recente para o mais antigo.
 * 3. O streak atual só é considerado ativo (> 0) se o último treino ocorreu hoje ou ontem
 *    no fuso horário do atleta.
 * 4. A partir do dia mais recente válido, conta quantos dias consecutivos (diferença de 1 dia)
 *    ocorreram sem interrupção.
 */
export function calculateActiveStreak(
  dates: (Date | string)[],
  referenceDate: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): number {
  if (!dates || dates.length === 0) return 0;

  const tz = resolveValidTimeZone(timezone);
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
  const yesterdayStr = subtractOneDay(todayStr);
  const validLatestDays = new Set([todayStr, yesterdayStr]);

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

    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}
