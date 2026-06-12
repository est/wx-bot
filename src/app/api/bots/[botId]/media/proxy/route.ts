import { NextRequest } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { downloadAndDecrypt, downloadPlain, guessMime } from "@/lib/weixin/cdn";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { botId } = await params;
  const ownership = await requireBotOwner(botId, auth.userId);
  if ("error" in ownership) return ownership.error;

  const sp = req.nextUrl.searchParams;
  const eqp = sp.get("eqp"); // encrypt_query_param
  const ak = sp.get("ak");   // aes_key (base64)
  const fu = sp.get("fu");   // full_url
  const mime = sp.get("mime") || "application/octet-stream";
  const plain = sp.get("plain") === "1";

  if (!eqp && !fu) {
    return new Response("Missing eqp or fu", { status: 400 });
  }

  try {
    let data: Buffer;
    if (plain || !ak) {
      data = await downloadPlain(eqp || "", fu || undefined);
    } else {
      data = await downloadAndDecrypt(eqp || "", ak, fu || undefined);
    }

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(String(err), { status: 502 });
  }
}
