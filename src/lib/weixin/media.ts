import crypto from "node:crypto";
import { getMediaUploadUrl } from "./adapter";
import { UploadMediaType } from "./client";
import { encryptAesEcb } from "./cdn";

export async function uploadMedia(
  botId: string,
  fileBuffer: Buffer,
  mimeType: string,
  toUserId: string
) {
  const rawsize = fileBuffer.length;
  const rawfilemd5 = crypto.createHash("md5").update(fileBuffer).digest("hex");
  const aeskey = crypto.randomBytes(16);
  const encrypted = encryptAesEcb(fileBuffer, aeskey);
  const filesize = encrypted.length;

  let mediaType: number = UploadMediaType.FILE;
  if (mimeType.startsWith("image/")) mediaType = UploadMediaType.IMAGE;
  else if (mimeType.startsWith("video/")) mediaType = UploadMediaType.VIDEO;
  else if (mimeType.startsWith("audio/")) mediaType = UploadMediaType.VOICE;

  const uploadResp = await getMediaUploadUrl(botId, {
    media_type: mediaType,
    to_user_id: toUserId,
    rawsize,
    rawfilemd5,
    filesize,
    aeskey: aeskey.toString("hex"),
  });

  // Upload to CDN via POST (matches official openclaw-weixin package)
  // Read download param from x-encrypted-param response header
  let downloadParam = uploadResp.upload_param;

  if (uploadResp.upload_full_url) {
    let lastErr: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(uploadResp.upload_full_url, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Uint8Array(encrypted),
        });
        if (res.status >= 400 && res.status < 500) {
          throw new Error(`CDN client error ${res.status}`);
        }
        if (res.status !== 200) {
          throw new Error(`CDN server error ${res.status}`);
        }
        // Official package reads download param from response header
        const headerParam = res.headers.get("x-encrypted-param");
        if (headerParam) downloadParam = headerParam;
        break;
      } catch (err) {
        lastErr = err;
        if (i < 2) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
    if (lastErr && !downloadParam) throw lastErr;
  }

  // aes_key in message must be base64 (not hex)
  return {
    encrypt_query_param: downloadParam,
    aes_key: aeskey.toString("base64"),
    encrypt_type: 1,
  };
}
