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
  const rawfilemd5 = crypto
    .createHash("md5")
    .update(fileBuffer)
    .digest("hex");
  const aeskey = crypto.randomBytes(16);
  const encrypted = encryptAesEcb(fileBuffer, aeskey);
  const filesize = encrypted.length;
  const aeskeyHex = aeskey.toString("hex");

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
    aeskey: aeskeyHex,
  });

  if (uploadResp.upload_full_url && uploadResp.upload_param) {
    let lastErr: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(uploadResp.upload_full_url, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Uint8Array(encrypted),
        });
        if (res.ok) break;
        lastErr = new Error(`Upload failed: ${res.status}`);
      } catch (err) {
        lastErr = err;
      }
      if (i < 2) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
    if (lastErr) throw lastErr;
  }

  return {
    encrypt_query_param: uploadResp.upload_param,
    aes_key: aeskeyHex,
    encrypt_type: 0,
  };
}
