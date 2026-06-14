import { createHmac, timingSafeEqual } from "node:crypto";

export const SEAL_SECRET =
  process.env.VERCEL_PROJECT_ID || "wx-bot-local-dev-seal-fallback";

// Compact binary seal: sentCreate(8) + exp(4) + botId(16) + HMAC(32) = 60 bytes → ~80 chars base64url
//
// sentCreate: the create_time_ms of the sent message, used to match the quoted reply
// exp: unix timestamp (seconds) when this pollUrl expires, prevents unbounded polling
// botId: which bot this webhook belongs to
// HMAC-SHA256: prevents forgery

export function sealWebhook(data: {
  botId: string;
  sentCreate: number;
  exp: number;
}): string {
  const buf = Buffer.alloc(28);
  buf.writeBigInt64BE(BigInt(data.sentCreate), 0);
  buf.writeUInt32BE(data.exp >>> 0, 8);
  Buffer.from(data.botId.replace(/-/g, ""), "hex").copy(buf, 12);
  const sig = createHmac("sha256", SEAL_SECRET).update(buf).digest();
  return Buffer.concat([buf, sig]).toString("base64url");
}

export function unsealWebhook(token: string): {
  botId: string;
  sentCreate: number;
  exp: number;
} | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length !== 60) return null;
    const payload = raw.subarray(0, 28);
    const expected = createHmac("sha256", SEAL_SECRET).update(payload).digest();
    if (!timingSafeEqual(raw.subarray(28), expected)) return null;

    const sentCreate = Number(payload.readBigInt64BE(0));
    const exp = payload.readUInt32BE(8);
    const uuid = [
      payload.subarray(12, 16).toString("hex"),
      payload.subarray(16, 18).toString("hex"),
      payload.subarray(18, 20).toString("hex"),
      payload.subarray(20, 22).toString("hex"),
      payload.subarray(22, 28).toString("hex"),
    ].join("-");
    return { botId: uuid, sentCreate, exp };
  } catch {
    return null;
  }
}
