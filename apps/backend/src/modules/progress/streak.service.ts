/**
 * Calcula a sequência de dias consecutivos ativos (streak).
 * 
 * Regras:
 * 1. Extrai todos os dias únicos em que houve sessão de treino (formato YYYY-MM-DD).
 * 2. Ordena os dias do mais recente para o mais antigo.
 * 3. O streak atual só é considerado ativo (> 0) se o último treino ocorreu hoje ou ontem
 *    (em relação à data de referência / timezone).
 * 4. A partir do dia mais recente, conta quantos dias consecutivos (diferença de exatamente 1 dia)
 *    ocorreram sem interrupção.
 */
export function calculateActiveStreak(
  dates: (Date | string)[],
  referenceDate: Date = new Date()
): number {
  if (!dates || dates.length === 0) return 0;

  const daySet = new Set<string>();

  for (const item of dates) {
    if (!item) continue;
    const d = typeof item === 'string' ? new Date(item) : item;
    if (isNaN(d.getTime())) continue;

    // Normaliza para string YYYY-MM-DD considerando a data da sessão
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    daySet.add(`${yyyy}-${mm}-${dd}`);

    // Também adiciona em UTC caso a sessão tenha sido gravada em UTC
    const utcY = d.getUTCFullYear();
    const utcM = String(d.getUTCMonth() + 1).padStart(2, '0');
    const utcD = String(d.getUTCDate()).padStart(2, '0');
    daySet.add(`${utcY}-${utcM}-${utcD}`);
  }

  // Ordena os dias únicos em ordem decrescente (mais recente primeiro)
  const sortedDays = Array.from(daySet).sort().reverse();
  if (sortedDays.length === 0) return 0;

  // Determina as strings de "hoje" e "ontem" para a data de referência
  const ref = referenceDate;
  const todayLocal = formatDateStr(ref.getFullYear(), ref.getMonth() + 1, ref.getDate());
  
  const yestLocalRef = new Date(ref);
  yestLocalRef.setDate(yestLocalRef.getDate() - 1);
  const yestLocal = formatDateStr(yestLocalRef.getFullYear(), yestLocalRef.getMonth() + 1, yestLocalRef.getDate());

  const todayUtc = formatDateStr(ref.getUTCFullYear(), ref.getUTCMonth() + 1, ref.getUTCDate());
  const yestUtcRef = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() - 1));
  const yestUtc = formatDateStr(yestUtcRef.getUTCFullYear(), yestUtcRef.getUTCMonth() + 1, yestUtcRef.getUTCDate());

  const validLatestDays = new Set([todayLocal, yestLocal, todayUtc, yestUtc]);

  // Encontra o ponto de início mais recente que seja hoje ou ontem
  let startIndex = -1;
  for (let i = 0; i < sortedDays.length; i++) {
    if (validLatestDays.has(sortedDays[i])) {
      startIndex = i;
      break;
    }
  }

  // Se nenhum dos dias recentes é hoje ou ontem, a sequência foi quebrada
  if (startIndex === -1) {
    return 0;
  }

  let streak = 1;
  for (let i = startIndex; i < sortedDays.length - 1; i++) {
    const current = parseDateStr(sortedDays[i]);
    const previous = parseDateStr(sortedDays[i + 1]);

    const diffMs = current.getTime() - previous.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays === 0) {
      // Mesmo dia (duplicado por timezone), continua sem quebrar
      continue;
    } else {
      // Sequência quebrou
      break;
    }
  }

  return streak;
}

function formatDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
