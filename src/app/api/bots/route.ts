import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { startQrLogin } from "@/lib/weixin/qr-login";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botList = await db.query.bots.findMany({
      where: eq(bots.userId, session.userId),
      orderBy: (bots, { desc }) => [desc(bots.createdAt)],
    });

    return NextResponse.json(
      botList.map((b) => ({
        id: b.id,
        name: b.name,
        accountId: b.accountId,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = (await req.json()) as { name?: string };
    const botId = randomUUID();

    const { sessionId, qrcodeUrl } = await startQrLogin();

    await db.insert(bots).values({
      id: botId,
      userId: session.userId,
      name: name || "未命名",
      status: "pending",
    });

    return NextResponse.json({ botId, sessionId, qrcodeUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
