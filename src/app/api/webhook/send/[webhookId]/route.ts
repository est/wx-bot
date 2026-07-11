import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botWebhooks, bots, messages } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensurePollChain } from "@/lib/poll";
import { sealWebhook } from "@/lib/seal";
import { sendTextMessage, sendMediaMessage, notifyStart } from "@/lib/weixin/adapter";
import { uploadMedia } from "@/lib/weixin/media";
import { buildMessageItems } from "@/lib/weixin/message-builder";

const FILE_FIELDS = ["image", "audio", "video"] as const;

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

  const ct = req.headers.get("content-type") || "";
  let text = "";
  let waitfor: string | null = null;
  let fileField: string | null = null;
  let file: File | null = null;

  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    text = String(form.get("text") || "");
    waitfor = form.get("waitfor") as string | null;

    for (const field of FILE_FIELDS) {
      const f = form.get(field);
      if (f instanceof File && f.size > 0) {
        fileField = field;
        file = f;
        break;
      }
    }
  } else {
    const body = await req.json();
    text = body.text || "";
    waitfor = body.waitfor != null ? String(body.waitfor) : null;
  }

  // URL query params control server behavior (e.g. waitfor).
  // POST body/form-data controls the actual webhook content (text, files).
  waitfor = req.nextUrl.searchParams.get("waitfor") || waitfor;

  if (!text && !file) {
    return NextResponse.json({ error: "Missing text or file (image/audio/video)" }, { status: 400 });
  }

  const toUserId = bot.ownerWxUserId;

  // Look up latest context_token from messages table (set by queue poll from getUpdates).
  // Official package caches this per-user; we query on demand.
  const lastMsg = await db.query.messages.findFirst({
    where: and(eq(messages.botId, webhook.botId), eq(messages.toUserId, toUserId)),
    orderBy: (t, { desc }) => desc(t.id),
    columns: { contextToken: true },
  });
  const contextToken = lastMsg?.contextToken || undefined;

  // Tell server this bot is alive. Session maintenance is the queue poll's job.
  // Non-fatal: if notifyStart fails, sendmessage might still work.
  try { await notifyStart(webhook.botId); } catch (err) {
    console.error(`[webhook-send] notifyStart failed (non-fatal): ${err}`);
  }

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaRef = await uploadMedia(webhook.botId, buffer, file.type || "application/octet-stream", toUserId);
    const items = buildMessageItems(fileField!, mediaRef, file.name, buffer.length, text || undefined);
    await sendMediaMessage(webhook.botId, { toUserId, itemList: items, contextToken });
  } else {
    // Text-only message
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }
    await sendTextMessage(webhook.botId, { toUserId, text, contextToken });
  }

  const sealed = sealWebhook({ botId: webhook.botId, sentTime: Date.now() });
  console.log(`[webhook-send] botId=${webhook.botId} len=${text.length} file=${file?.name || "none"}`);

  ensurePollChain().catch(() => {});

  await db.update(botWebhooks)
    .set({ accessedAt: new Date() })
    .where(eq(botWebhooks.id, webhookId));

  let pollUrl = `${req.nextUrl.origin}/api/webhook/reply/${sealed}`;
  if (waitfor) pollUrl += `?waitfor=${encodeURIComponent(waitfor)}`;

  // Form/multipart: redirect to pollUrl for curl -L support.
  // 303 forces the client to switch to GET for the redirect target (pollUrl is GET-only).
  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(pollUrl, 303);
  }

  return NextResponse.json({ pollUrl });
}
