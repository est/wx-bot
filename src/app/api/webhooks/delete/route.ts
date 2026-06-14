import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { botWebhooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const webhook = await db.query.botWebhooks.findFirst({
    where: eq(botWebhooks.id, id),
  });
  if (!webhook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { requireBotOwner } = await import("@/lib/auth/guard");
  const ownership = await requireBotOwner(webhook.botId, auth.userId);
  if ("error" in ownership) return ownership.error;

  await db.delete(botWebhooks).where(eq(botWebhooks.id, id));
  return NextResponse.json({ ok: true });
}
