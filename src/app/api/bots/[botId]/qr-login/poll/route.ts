import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { pollQrLogin } from "@/lib/weixin/qr-login";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const loginSessionId = searchParams.get("sessionId");

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
        .where(and(eq(bots.id, botId), eq(bots.userId, session.userId)));
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
