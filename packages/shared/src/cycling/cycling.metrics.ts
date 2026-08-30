/**
 * Calcula a velocidade média em km/h a partir da distância em km e duração em segundos.
 */
export function calculateCyclingSpeed(distanceKm: number, durationSeconds: number): number {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds || durationSeconds <= 0) {
    return 0;
  }
  const hours = durationSeconds / 3600;
  return Math.round((distanceKm / hours) * 10) / 10;
}

/**
 * Calcula o ritmo de pedal em segundos por quilômetro.
 */
export function calculateCyclingPace(distanceKm: number, durationSeconds: number): number {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds || durationSeconds <= 0) {
    return 0;
  }
  return Math.round(durationSeconds / distanceKm);
}
