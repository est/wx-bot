import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { pollQrLogin } from "@/lib/weixin/qr-login";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const { botId } = await params;
    const ownership = await requireBotOwner(botId, auth.userId);
    if ("error" in ownership) return ownership.error;

    const loginSessionId = req.nextUrl.searchParams.get("sessionId");
    if (!loginSessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const result = await pollQrLogin(loginSessionId);

    if (result.status === "confirmed" && result.token && result.accountId) {
      await db
        .update(bots)
        .set({
          token: result.token,
          accountId: result.accountId,
          baseUrl: result.baseUrl,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(bots.id, botId));
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
