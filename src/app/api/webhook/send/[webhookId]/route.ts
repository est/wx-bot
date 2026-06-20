import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { botWebhooks, bots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ensurePollChain } from "@/lib/poll";
import { sealWebhook } from "@/lib/seal";
import { sendTextMessage, sendMediaMessage } from "@/lib/weixin/adapter";
import { uploadMedia } from "@/lib/weixin/media";

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

  if (!text && !file) {
    return NextResponse.json({ error: "Missing text or file (image/audio/video)" }, { status: 400 });
  }

  const toUserId = bot.ownerWxUserId;

  if (file) {
    // Upload file to CDN and send as media message
    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaRef = await uploadMedia(webhook.botId, buffer, file.type || "application/octet-stream", toUserId);

    // Build message item based on field name
    const mediaTypeMap: Record<string, number> = { image: 2, audio: 3, video: 5 };
    const mediaType = mediaTypeMap[fileField!] || 4;

    const items: any[] = [];
    if (mediaType === 2) {
      items.push({ type: 2, image_item: { media: mediaRef, ...(text ? { mid_size: buffer.length } : {}) } });
    } else if (mediaType === 3) {
      items.push({ type: 3, voice_item: { media: mediaRef, playtime: 0 } });
    } else if (mediaType === 5) {
      items.push({ type: 5, video_item: { media: mediaRef } });
    } else {
      items.push({ type: 4, file_item: { media: mediaRef, file_name: file.name } });
    }
    // Optional text caption
    if (text) {
      items.push({ type: 1, text_item: { text } });
    }

    await sendMediaMessage(webhook.botId, { toUserId, itemList: items });
  } else {
    // Text-only message
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }
    await sendTextMessage(webhook.botId, { toUserId, text });
  }

  const sealed = sealWebhook({ botId: webhook.botId, sentTime: Date.now() });
  console.log(`[webhook-send] botId=${webhook.botId} len=${text.length} file=${file?.name || "none"}`);

  ensurePollChain().catch(() => {});

  await db.update(botWebhooks)
    .set({ accessedAt: new Date() })
    .where(eq(botWebhooks.id, webhookId));

  let pollUrl = `${req.nextUrl.origin}/api/webhook/reply/${sealed}`;
  if (waitfor) pollUrl += `?waitfor=${encodeURIComponent(waitfor)}`;

  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(pollUrl);
  }

  return NextResponse.json({ pollUrl });
}
