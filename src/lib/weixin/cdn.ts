import { createCipheriv, createDecipheriv } from "node:crypto";

const DEFAULT_CDN_BASE = "https://novac2c.cdn.weixin.qq.com/c2c";

export function encryptAesEcb(plaintext: Buffer, key: Buffer): Buffer {
  const cipher = createCipheriv("aes-128-ecb", key, null);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

export function decryptAesEcb(ciphertext: Buffer, key: Buffer): Buffer {
  const decipher = createDecipheriv("aes-128-ecb", key, null);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function aesEcbPaddedSize(plaintextSize: number): number {
  return Math.ceil((plaintextSize + 1) / 16) * 16;
}

/**
 * Parse CDNMedia.aes_key into raw 16-byte AES key.
 * Two formats seen in the wild:
 *   - base64(raw 16 bytes) → common for images
 *   - base64(hex string of 32 chars) → file/voice/video
 */
export function parseAesKey(aesKeyBase64: string): Buffer {
  const decoded = Buffer.from(aesKeyBase64, "base64");
  if (decoded.length === 16) {
    return decoded;
  }
  if (
    decoded.length === 32 &&
    /^[0-9a-fA-F]{32}$/.test(decoded.toString("ascii"))
  ) {
    return Buffer.from(decoded.toString("ascii"), "hex");
  }
  throw new Error(
    `aes_key must decode to 16 bytes or 32-char hex, got ${decoded.length}`
  );
}

export function buildCdnDownloadUrl(
  encryptedQueryParam: string,
  cdnBaseUrl = DEFAULT_CDN_BASE
): string {
  return `${cdnBaseUrl}/download?encrypted_query_param=${encodeURIComponent(encryptedQueryParam)}`;
}

export async function downloadAndDecrypt(
  encryptedQueryParam: string,
  aesKeyBase64: string,
  fullUrl?: string,
  cdnBaseUrl = DEFAULT_CDN_BASE
): Promise<Buffer> {
  const key = parseAesKey(aesKeyBase64);
  const url = fullUrl || buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CDN download failed: ${res.status}`);
  }

  const encrypted = Buffer.from(await res.arrayBuffer());
  return decryptAesEcb(encrypted, key);
}

export async function downloadPlain(
  encryptedQueryParam: string,
  fullUrl?: string,
  cdnBaseUrl = DEFAULT_CDN_BASE
): Promise<Buffer> {
  const url = fullUrl || buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CDN download failed: ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Guess MIME type from file extension or return octet-stream.
 */
export function guessMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    mp4: "video/mp4",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    silk: "audio/silk",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    txt: "text/plain",
  };
  return map[ext] || "application/octet-stream";
}
