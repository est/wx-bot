import crypto from "node:crypto";
import { getMediaUploadUrl } from "./adapter";
import { UploadMediaType } from "./client";

function aesEncrypt(data: Buffer, key: Buffer): Buffer {
  const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

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
  const encrypted = aesEncrypt(fileBuffer, aeskey);
  const filesize = encrypted.length;
  const aeskeyB64 = aeskey.toString("base64");

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
    aeskey: aeskeyB64,
  });

  if (uploadResp.upload_full_url && uploadResp.upload_param) {
    await fetch(uploadResp.upload_full_url, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(encrypted),
    });
  }

  return {
    encrypt_query_param: uploadResp.upload_param,
    aes_key: aeskeyB64,
    encrypt_type: 0,
  };
}
