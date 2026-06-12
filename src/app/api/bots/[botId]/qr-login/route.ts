import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { startQrLogin } from "@/lib/weixin/qr-login";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const { botId } = await params;
    const ownership = await requireBotOwner(botId, auth.userId);
    if ("error" in ownership) return ownership.error;

    const { sessionId, qrcodeUrl } = await startQrLogin();

    return NextResponse.json({ botId, sessionId, qrcodeUrl });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
