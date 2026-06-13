const CORS_PROXY = "/api/cors-proxy?url=";

export async function fetchWithCorsFallback(url: string): Promise<ArrayBuffer> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.arrayBuffer();
  } catch {
    // CORS or network error, try proxy
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy failed: ${res.status}`);
    return res.arrayBuffer();
  }
}
