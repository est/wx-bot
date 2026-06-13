const CORS_PROXY = "/api/cors-proxy?url=";

export async function fetchWithCorsFallback(url: string): Promise<ArrayBuffer> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.arrayBuffer();
  } catch (err) {
    console.log(`[cors-fetch] direct failed (${url.slice(0, 60)}...), trying proxy`);
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`[cors-fetch] proxy ${res.status}: ${url.slice(0, 60)}`);
    return res.arrayBuffer();
  }
}
