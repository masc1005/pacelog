export function calculateSwimmingPace(
  durationSeconds: number,
  distanceMeters: number
): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
  return (durationSeconds / distanceMeters) * 100;
}

export function calculateTotalLaps(
  distanceMeters: number,
  poolLengthMeters: number
): number {
  if (poolLengthMeters <= 0 || distanceMeters <= 0) return 0;
  return distanceMeters / poolLengthMeters;
}

export function calculateSwolf(
  timeInSecondsForPoolLength: number,
  strokeCount: number
): number {
  if (timeInSecondsForPoolLength <= 0 || strokeCount <= 0) return 0;
  return timeInSecondsForPoolLength + strokeCount;
}
