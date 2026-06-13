import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url param", { status: 400 });
  }

  // Only allow Weixin CDN domains
  const allowed = [
    "novac2c.cdn.weixin.qq.com",
    "cdn.weixin.qq.com",
  ];
  try {
    const host = new URL(url).hostname;
    if (!allowed.some((d) => host.endsWith(d))) {
      return new Response("Domain not allowed", { status: 403 });
    }
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: res.status });
    }

    const data = await res.arrayBuffer();
    return new Response(data, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(`Fetch failed: ${err}`, { status: 502 });
  }
}
