import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { startQrLogin } from "@/lib/weixin/qr-login";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = await params;
    const bot = await db.query.bots.findFirst({
      where: and(eq(bots.id, botId), eq(bots.userId, session.userId)),
    });

    if (!bot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { sessionId, qrcodeUrl } = await startQrLogin();

    return NextResponse.json({ botId, sessionId, qrcodeUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
