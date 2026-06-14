import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { botWebhooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const botId = req.nextUrl.searchParams.get("botId");
  if (!botId) {
    return NextResponse.json({ error: "Missing botId" }, { status: 400 });
  }

  const ownership = await requireBotOwner(botId, auth.userId);
  if ("error" in ownership) return ownership.error;

  const hooks = await db.query.botWebhooks.findMany({
    where: eq(botWebhooks.botId, botId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  });

  return NextResponse.json(hooks);
}
