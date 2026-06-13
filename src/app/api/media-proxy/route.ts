import { NextRequest } from "next/server";
import { downloadAndDecryptBuffer } from "@tencent-weixin/openclaw-weixin/dist/src/cdn/pic-decrypt.js";
import { downloadPlainCdnBuffer } from "@tencent-weixin/openclaw-weixin/dist/src/cdn/pic-decrypt.js";

/**
 * Media proxy — delegates to the official openclaw-weixin package for CDN fetch + decrypt.
 *
 * Accepts the raw CDN media fields from the message body (not pre-constructed URLs).
 * If the package changes its field parsing or decrypt logic, this proxy adapts automatically.
 *
 * Query params:
 *   eqp  — encrypt_query_param (CDN download param)
 *   ak   — aes_key (base64)
 *   fu   — full_url (optional, direct CDN URL)
 *   mime — response Content-Type
 *   cdn  — CDN base URL (optional, defaults to novac2c.cdn.weixin.qq.com/c2c)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const eqp = sp.get("eqp") || "";
  const ak = sp.get("ak") || "";
  const fu = sp.get("fu") || undefined;
  const mime = sp.get("mime") || "application/octet-stream";
  const cdn = sp.get("cdn") || "https://novac2c.cdn.weixin.qq.com/c2c";

  if (!eqp && !fu) {
    return new Response("Missing eqp or fu", { status: 400 });
  }

  try {
    let data: Buffer;
    if (ak) {
      // Encrypted: use package's decrypt function
      data = await downloadAndDecryptBuffer(eqp, ak, cdn, "media-proxy", fu);
    } else {
      // Plain: just download
      data = await downloadPlainCdnBuffer(eqp, cdn, "media-proxy", fu);
    }

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(`Media fetch failed: ${err}`, { status: 502 });
  }
}
