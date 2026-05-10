/**
 * Determina si una predicción está bloqueada según la fecha del partido.
 *
 * Una predicción se bloquea cuando el partido ya comenzó.
 */
export function isPredictionLocked(matchDate: string | Date): boolean {
  const now = new Date();
  const match = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  return match <= now;
}
