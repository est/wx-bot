import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botWebhooks, bots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ensurePollChain } from "@/lib/poll";
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

  let text: string;
  let waitfor: string | null = null;

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    text = String(form.get("text") || "");
    waitfor = form.get("waitfor") as string | null;
  } else {
    const body = await req.json();
    text = body.text;
    waitfor = body.waitfor != null ? String(body.waitfor) : null;
  }

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const result = await sendTextMessage(webhook.botId, {
    toUserId: bot.ownerWxUserId,
    text,
  });

  const sealed = sealWebhook({
    botId: webhook.botId,
    sentTime: Date.now(),
  });

  console.log(`[webhook-send] botId=${webhook.botId} text=${text.slice(0, 50)}`);

  // Ensure poll chain is running to collect the reply
  ensurePollChain().catch(() => {});

  await db.update(botWebhooks)
    .set({ accessedAt: new Date() })
    .where(eq(botWebhooks.id, webhookId));

  let pollUrl = `${req.nextUrl.origin}/api/webhook/reply/${sealed}`;
  if (waitfor) pollUrl += `?waitfor=${encodeURIComponent(waitfor)}`;

  // Form: redirect to pollUrl for curl -L support
  if (ct.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(pollUrl);
  }

  return NextResponse.json({ pollUrl });
}
