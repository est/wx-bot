import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { startQrLogin } from "@/lib/weixin/qr-login";

export async function GET() {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const botList = await db.query.bots.findMany({
      where: eq(bots.userId, auth.userId),
      orderBy: (bots, { desc }) => [desc(bots.createdAt)],
    });

    return NextResponse.json(
      botList.map((b) => ({
        id: b.id,
        accountId: b.accountId,
        ownerWxUserId: b.ownerWxUserId,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }))
    );
  } catch (err) {
    console.error("[GET /api/bots]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const botId = randomUUID();
    const { sessionId, qrcodeUrl } = await startQrLogin();

    await db.insert(bots).values({
      id: botId,
      userId: auth.userId,
      status: "pending",
    });

    return NextResponse.json({ botId, sessionId, qrcodeUrl });
  } catch (err) {
    console.error("[POST /api/bots]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
