/**
 * Media URL helpers.
 *
 * The proxy uses the official openclaw-weixin package's downloadAndDecryptBuffer()
 * for CDN fetch + AES-ECB decrypt. We pass the raw message fields (eqp, ak, fu)
 * to the proxy, which delegates to the package.
 *
 * This way, if the package changes its URL construction or decrypt logic,
 * the proxy adapts automatically on the next deploy.
 */

import type { CDNMedia } from "@/lib/weixin/types";

const MEDIA_PROXY = "/api/media-proxy";

/**
 * Build a proxy URL from raw CDN media fields.
 * Pass the fields directly from the message — don't pre-process them.
 */
export function cdnProxyUrl(cdn: CDNMedia, mime: string): string | null {
  if (!cdn.encrypt_query_param && !cdn.full_url) return null;

  const p = new URLSearchParams({ mime });
  if (cdn.encrypt_query_param) p.set("eqp", cdn.encrypt_query_param);
  if (cdn.aes_key) p.set("ak", cdn.aes_key);
  if (cdn.full_url) p.set("fu", cdn.full_url);
  return `${MEDIA_PROXY}?${p}`;
}

/**
 * Get URL for a plain (unencrypted) CDN resource.
 */
export function cdnPlainUrl(cdn: CDNMedia): string | null {
  if (cdn.full_url && !cdn.aes_key) return cdn.full_url;
  return null;
}
