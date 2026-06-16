export const POLL_INTERVAL_SEC = 120;

export function pollIdempotencyKey(): string {
  return `poll-${Math.floor(Date.now() / (POLL_INTERVAL_SEC * 1000))}`;
}
