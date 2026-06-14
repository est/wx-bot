/**
 * Media URL helpers.
 *
 * Builds URLs for the cdn-proxy endpoint, which delegates to the official
 * openclaw-weixin package's downloadAndDecryptBuffer() for CDN fetch + AES-ECB decrypt.
 * Raw message fields (eqp, ak, fu) are passed as query params — the proxy handles
 * URL construction and decryption.
 *
 * If the package changes its decrypt logic, the proxy adapts automatically on next deploy.
 */

import type { CDNMedia } from "@/lib/weixin/types";

const CDN_PROXY = "/api/cdn-proxy";

/**
 * Build a CDN proxy URL from raw CDN media fields.
 */
export function cdnProxyUrl(cdn: CDNMedia, mime: string, name?: string): string | null {
  if (!cdn.encrypt_query_param && !cdn.full_url) return null;

  const p = new URLSearchParams({ mime });
  if (cdn.encrypt_query_param) p.set("eqp", cdn.encrypt_query_param);
  if (cdn.aes_key) p.set("ak", cdn.aes_key);
  if (cdn.full_url) p.set("fu", cdn.full_url);
  if (name) p.set("name", name);
  return `${CDN_PROXY}?${p}`;
}

/**
 * Get URL for a plain (unencrypted) CDN resource.
 */
export function cdnPlainUrl(cdn: CDNMedia): string | null {
  if (cdn.full_url && !cdn.aes_key) return cdn.full_url;
  return null;
}
