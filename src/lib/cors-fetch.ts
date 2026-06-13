/**
 * Fetch media from Weixin CDN. All processing server-side via media-proxy.
 * Matches the official openclaw-weixin package approach (Node.js fetch + decrypt).
 */

const MEDIA_PROXY = "/api/media-proxy?url=";

export function cdnDirectUrl(cdn: { full_url?: string; encrypt_query_param?: string; aes_key?: string }): string | null {
  if (cdn.full_url && !cdn.aes_key) return cdn.full_url; // plain, no decrypt needed
  return null; // encrypted, must use proxy
}

export function cdnProxyUrl(cdn: { full_url?: string; encrypt_query_param?: string; aes_key?: string }, mime: string): string | null {
  const url = cdn.full_url || (cdn.encrypt_query_param
    ? `https://novac2c.cdn.weixin.qq.com/c2c/download?encrypted_query_param=${encodeURIComponent(cdn.encrypt_query_param)}`
    : null);
  if (!url) return null;

  let proxyUrl = `${MEDIA_PROXY}${encodeURIComponent(url)}`;
  if (cdn.aes_key) proxyUrl += `&key=${encodeURIComponent(cdn.aes_key)}`;
  proxyUrl += `&mime=${encodeURIComponent(mime)}`;
  return proxyUrl;
}
