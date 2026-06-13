import { NextRequest } from "next/server";
import crypto from "node:crypto";

/**
 * Media proxy: last-resort fallback for browser-side media playback.
 *
 * The media fetch chain is:
 *   1. Browser fetches CDN URL directly (fastest, no server load)
 *   2. If CORS blocked → /api/cors-proxy?url=... (just proxies, no decrypt)
 *   3. If aes-js CDN fails to load → /api/media-proxy?url=...&key=... (decrypts server-side)
 *
 * This proxy fetches encrypted media from Weixin CDN, decrypts with AES-128-ECB,
 * and returns plaintext bytes. Uses Node.js crypto (supports ECB natively).
 *
 * Security: only allows Weixin CDN domains.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const aesKeyB64 = req.nextUrl.searchParams.get("key");
  const mime = req.nextUrl.searchParams.get("mime") || "application/octet-stream";

  if (!url) {
    return new Response("Missing url param", { status: 400 });
  }

  const allowed = ["novac2c.cdn.weixin.qq.com", "cdn.weixin.qq.com"];
  try {
    const host = new URL(url).hostname;
    if (!allowed.some((d) => host.endsWith(d))) {
      return new Response("Domain not allowed", { status: 403 });
    }
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: res.status });
    }

    let data = Buffer.from(await res.arrayBuffer());

    // Decrypt if key provided
    if (aesKeyB64) {
      const key = parseAesKey(aesKeyB64);
      const decipher = crypto.createDecipheriv("aes-128-ecb", key, null);
      data = Buffer.concat([decipher.update(data), decipher.final()]);
    }

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(`Fetch failed: ${err}`, { status: 502 });
  }
}

/**
 * Parse AES key from base64 (supports both raw 16-byte and hex-in-base64 formats).
 * Matches the official openclaw-weixin package's parseAesKey logic.
 */
function parseAesKey(b64: string): Buffer {
  const decoded = Buffer.from(b64, "base64");
  if (decoded.length === 16) return decoded;
  if (decoded.length === 32 && /^[0-9a-fA-F]{32}$/.test(decoded.toString("ascii"))) {
    return Buffer.from(decoded.toString("ascii"), "hex");
  }
  throw new Error(`Invalid AES key: ${decoded.length} bytes`);
}
