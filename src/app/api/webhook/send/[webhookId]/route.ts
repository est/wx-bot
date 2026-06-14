import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botWebhooks, bots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sealWebhook } from "@/lib/seal";
import { sendTextMessage } from "@/lib/weixin/adapter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params;

  const webhook = await db.query.botWebhooks.findFirst({
    where: and(eq(botWebhooks.id, webhookId), eq(botWebhooks.enabled, true)),
  });
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found or disabled" }, { status: 404 });
  }

  const bot = await db.query.bots.findFirst({ where: eq(bots.id, webhook.botId) });
  if (!bot?.ownerWxUserId) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 400 });
  }

  const body = await req.json();
  const text = body.text as string;
  const timeout = Math.min(Math.max(body.timeout || 300, 1), 3600);

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const result = await sendTextMessage(webhook.botId, {
    toUserId: bot.ownerWxUserId,
    text,
  });

  const now = Math.floor(Date.now() / 1000);
  const sealed = await sealWebhook({
    botId: webhook.botId,
    toUserId: bot.ownerWxUserId,
    sentCreate: result.createTimeMs || 0,
    exp: now + timeout,
  });

  await db.update(botWebhooks)
    .set({ accessedAt: new Date() })
    .where(eq(botWebhooks.id, webhookId));

  return NextResponse.json({ pollUrl: `/api/webhook/reply/${sealed}` });
}
