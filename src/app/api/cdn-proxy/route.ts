import { NextRequest } from "next/server";
import { downloadAndDecryptBuffer } from "@tencent-weixin/openclaw-weixin/dist/src/cdn/pic-decrypt.js";
import { downloadPlainCdnBuffer } from "@tencent-weixin/openclaw-weixin/dist/src/cdn/pic-decrypt.js";

const CDN_ALLOWLIST = [
  "https://novac2c.cdn.weixin.qq.com/c2c",
  "https://cdn.weixin.qq.com",
];

/**
 * CDN proxy — fetches encrypted media from WeChat CDN and decrypts it.
 *
 * Delegates to the official openclaw-weixin package's downloadAndDecryptBuffer()
 * and downloadPlainCdnBuffer(). If the package changes its decrypt logic,
 * this endpoint adapts automatically on next deploy.
 *
 * Query params:
 *   eqp  — encrypt_query_param (CDN download param)
 *   ak   — aes_key (base64)
 *   fu   — full_url (optional, direct CDN URL)
 *   mime — response Content-Type
 *   name — filename for Content-Disposition
 *   cdn  — CDN base URL (optional, defaults to novac2c.cdn.weixin.qq.com/c2c, must be in allowlist)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const eqp = sp.get("eqp") || "";
  const ak = sp.get("ak") || "";
  const fu = sp.get("fu") || undefined;
  const mime = sp.get("mime") || "application/octet-stream";
  const name = sp.get("name") || undefined;
  const cdnParam = sp.get("cdn") || CDN_ALLOWLIST[0];
  const cdn = CDN_ALLOWLIST.some((d) => cdnParam.startsWith(d)) ? cdnParam : CDN_ALLOWLIST[0];

  if (!eqp && !fu) {
    return new Response("Missing eqp or fu", { status: 400 });
  }

  try {
    let data: Buffer;
    if (ak) {
      // Encrypted: use package's decrypt function
      data = await downloadAndDecryptBuffer(eqp, ak, cdn, "cdn-proxy", fu);
    } else {
      // Plain: just download
      data = await downloadPlainCdnBuffer(eqp, cdn, "cdn-proxy", fu);
    }

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
        ...(name ? { "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"` } : {}),
      },
    });
  } catch (err) {
    console.error("[cdn-proxy]", err);
    return new Response("Media fetch failed", { status: 502 });
  }
}
