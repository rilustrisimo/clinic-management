export const BACKOFF = {
  baseMs: 1000,
  factor: 2,
  maxMs: 30000,
  maxTries: 5,
} as const;

export function nextDelay(tries: number) {
  const { baseMs, factor, maxMs } = BACKOFF;
  return Math.min(maxMs, baseMs * Math.pow(factor, Math.max(0, tries)));
}
