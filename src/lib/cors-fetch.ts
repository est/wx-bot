/**
 * Media URL helpers.
 *
 * Uses the official openclaw-weixin package's downloadAndDecryptBuffer()
 * for CDN fetch + AES-ECB decrypt. We pass the raw message fields (eqp, ak, fu)
 * to the download endpoint, which delegates to the package.
 *
 * This way, if the package changes its URL construction or decrypt logic,
 * it adapts automatically on the next deploy.
 */

import type { CDNMedia } from "@/lib/weixin/types";

const MEDIA_DOWNLOAD = "/api/media-download";

/**
 * Build a download URL from raw CDN media fields.
 * Pass the fields directly from the message — don't pre-process them.
 */
export function cdnProxyUrl(cdn: CDNMedia, mime: string): string | null {
  if (!cdn.encrypt_query_param && !cdn.full_url) return null;

  const p = new URLSearchParams({ mime });
  if (cdn.encrypt_query_param) p.set("eqp", cdn.encrypt_query_param);
  if (cdn.aes_key) p.set("ak", cdn.aes_key);
  if (cdn.full_url) p.set("fu", cdn.full_url);
  return `${MEDIA_DOWNLOAD}?${p}`;
}

/**
 * Get URL for a plain (unencrypted) CDN resource.
 */
export function cdnPlainUrl(cdn: CDNMedia): string | null {
  if (cdn.full_url && !cdn.aes_key) return cdn.full_url;
  return null;
}
