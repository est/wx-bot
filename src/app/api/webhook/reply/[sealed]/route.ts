import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { unsealWebhook } from "@/lib/seal";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sealed: string }> }
) {
  const { sealed } = await params;
  const data = unsealWebhook(sealed);
  if (!data) {
    return NextResponse.json({ text: null, error: "bad seal" });
  }

  const { botId, sentTime } = data;
  const waitfor = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("waitfor")) || 0, 0),
    30
  );

  console.log(`[webhook-reply] botId=${botId} sentTime=${sentTime} waitfor=${waitfor}`);

  async function checkReply() {
    // Find recent incoming messages after sentTime - 5s
    const candidates = await db
      .select({ content: messages.content })
      .from(messages)
      .where(
        and(
          eq(messages.botId, botId),
          eq(messages.direction, "in"),
          gte(messages.createTimeMs, sentTime - 5_000),
        )
      )
      .orderBy(desc(messages.id))
      .limit(10);

    if (!candidates.length) return null;

    // 1. Try text replies (have ref_msg) — match by closest create_time_ms
    const withRef = candidates
      .map((row) => {
        try {
          const items = JSON.parse(row.content);
          const refMs = items?.[0]?.ref_msg?.message_item?.create_time_ms;
          if (refMs) {
            const item = items[0];
            const text = item.text_item?.text || item.voice_item?.text || null;
            return { text, diff: Math.abs(refMs - sentTime) };
          }
        } catch {}
        return null;
      })
      .filter((x): x is { text: string; diff: number } => x !== null)
      .sort((a, b) => a.diff - b.diff);

    if (withRef[0]?.text) return withRef[0].text;

    // 2. No ref_msg (image/audio/video replies) — return latest incoming message text
    //    These replies don't carry ref_msg in WeChat, so we just take the newest one
    for (const row of candidates) {
      try {
        const items = JSON.parse(row.content);
        const item = items[0];
        const text = item.text_item?.text || item.voice_item?.text || null;
        if (text) return text;
      } catch {}
    }

    return null;
  }

  const immediate = await checkReply();
  if (immediate) {
    return NextResponse.json({ text: immediate });
  }

  if (waitfor <= 0) {
    return NextResponse.json({ text: null });
  }

  const deadline = Date.now() + waitfor * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    const reply = await checkReply();
    if (reply) {
      return NextResponse.json({ text: reply });
    }
  }

  return NextResponse.json({ text: null });
}
