import { createHmac, timingSafeEqual } from "node:crypto";

export const SEAL_SECRET =
  process.env.VERCEL_PROJECT_ID || "wx-bot-local-dev-seal-fallback";

// Compact binary seal: sentTime(8) + botId(16) + HMAC(32) = 56 bytes → ~75 chars base64url
//
// sentTime: approximate send timestamp (Date.now() at webhook call), used to find the outgoing message
// botId: which bot this webhook belongs to
// HMAC-SHA256: prevents forgery

export function sealWebhook(data: {
  botId: string;
  sentTime: number;
}): string {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(BigInt(data.sentTime), 0);
  Buffer.from(data.botId.replace(/-/g, ""), "hex").copy(buf, 8);
  const sig = createHmac("sha256", SEAL_SECRET).update(buf).digest();
  return Buffer.concat([buf, sig]).toString("base64url");
}

export function unsealWebhook(token: string): {
  botId: string;
  sentTime: number;
} | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length !== 56) return null;
    const payload = raw.subarray(0, 24);
    const expected = createHmac("sha256", SEAL_SECRET).update(payload).digest();
    if (!timingSafeEqual(raw.subarray(24), expected)) return null;

    const sentTime = Number(payload.readBigInt64BE(0));
    const hex = payload.subarray(8, 24).toString("hex");
    const botId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    return { botId, sentTime };
  } catch {
    return null;
  }
}
