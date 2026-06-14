import { createHmac, timingSafeEqual } from "node:crypto";

export const SEAL_SECRET =
  process.env.VERCEL_PROJECT_ID || "wx-bot-local-dev-seal-fallback";

// Compact binary seal: exp(4) + botId(16) + toUserId(16) + HMAC(32) = 68 bytes → ~92 chars base64url
//
// botId: which bot this webhook belongs to
// toUserId: target WeChat user, used to find the latest outgoing message and its quoted reply
// exp: unix timestamp (seconds) when this pollUrl expires, prevents unbounded polling
// HMAC-SHA256: prevents forgery

export function sealWebhook(data: {
  botId: string;
  toUserId: string;
  exp: number;
}): string {
  const buf = Buffer.alloc(36);
  buf.writeUInt32BE(data.exp >>> 0, 0);
  Buffer.from(data.botId.replace(/-/g, ""), "hex").copy(buf, 4);
  Buffer.from(data.toUserId.replace(/-/g, ""), "hex").copy(buf, 20);
  const sig = createHmac("sha256", SEAL_SECRET).update(buf).digest();
  return Buffer.concat([buf, sig]).toString("base64url");
}

export function unsealWebhook(token: string): {
  botId: string;
  toUserId: string;
  exp: number;
} | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length !== 100) return null;
    const payload = raw.subarray(0, 36);
    const expected = createHmac("sha256", SEAL_SECRET).update(payload).digest();
    if (!timingSafeEqual(raw.subarray(36), expected)) return null;

    const exp = payload.readUInt32BE(0);
    const uuidFromBuf = (offset: number, len: number) => {
      const hex = payload.subarray(offset, offset + len).toString("hex");
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    };
    return { botId: uuidFromBuf(4, 16), toUserId: uuidFromBuf(20, 16), exp };
  } catch {
    return null;
  }
}
