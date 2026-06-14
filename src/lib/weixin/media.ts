import crypto from "node:crypto";
import { getMediaUploadUrl } from "./adapter";
import { UploadMediaType } from "./client";
import { uploadBufferToCdn } from "@tencent-weixin/openclaw-weixin/dist/src/cdn/cdn-upload.js";
import { aesEcbPaddedSize } from "./cdn";

const DEFAULT_CDN_BASE = "https://novac2c.cdn.weixin.qq.com/c2c";

export async function uploadMedia(
  botId: string,
  fileBuffer: Buffer,
  mimeType: string,
  toUserId: string
) {
  const rawsize = fileBuffer.length;
  const rawfilemd5 = crypto.createHash("md5").update(fileBuffer).digest("hex");
  const aeskey = crypto.randomBytes(16);
  const aeskeyHex = aeskey.toString("hex"); // hex for getUploadUrl
  const filesize = aesEcbPaddedSize(rawsize);
  const filekey = crypto.randomBytes(16).toString("hex");

  let mediaType: number = UploadMediaType.FILE;
  if (mimeType.startsWith("image/")) mediaType = UploadMediaType.IMAGE;
  else if (mimeType.startsWith("video/")) mediaType = UploadMediaType.VIDEO;
  else if (mimeType.startsWith("audio/")) mediaType = UploadMediaType.VOICE;

  let uploadResp: any;
  try {
    uploadResp = await getMediaUploadUrl(botId, {
      filekey,
      media_type: mediaType,
      to_user_id: toUserId,
      rawsize,
      rawfilemd5,
      filesize,
      no_need_thumb: true,
      aeskey: aeskeyHex,
    });
    console.log("[upload] getUploadUrl response:", JSON.stringify(uploadResp));
  } catch (err) {
    console.error("[upload] getUploadUrl threw:", err);
    throw new Error(`getUploadUrl failed: ${err}`);
  }

  if (!uploadResp.upload_full_url && !uploadResp.upload_param) {
    throw new Error(`getUploadUrl returned no URL: ${JSON.stringify(uploadResp)}`);
  }

  // Delegate CDN upload to the official package's function
  const { downloadParam } = await uploadBufferToCdn({
    buf: fileBuffer,
    uploadFullUrl: uploadResp.upload_full_url,
    uploadParam: uploadResp.upload_param,
    filekey,
    cdnBaseUrl: DEFAULT_CDN_BASE,
    label: "uploadMedia",
    aeskey,
  });

  // aes_key format: base64 of hex string (matches official package)
  // Include full_url so cdn-proxy can download without fallback URL construction
  const fullUrl = `${DEFAULT_CDN_BASE}/download?encrypted_query_param=${encodeURIComponent(downloadParam)}`;
  return {
    encrypt_query_param: downloadParam,
    aes_key: Buffer.from(aeskeyHex).toString("base64"),
    encrypt_type: 1,
    full_url: fullUrl,
    md5: rawfilemd5,
    len: rawsize,
  };
}
