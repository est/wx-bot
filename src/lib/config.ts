import { send } from "@vercel/queue";

export const POLL_INTERVAL_SEC = 120;

export async function ensurePollChain() {
  await send("poll", {}, {
    delaySeconds: 0,
    idempotencyKey: `poll-${Math.floor(Date.now() / (POLL_INTERVAL_SEC * 1000))}`,
  });
}
