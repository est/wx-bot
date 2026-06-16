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
    // Why two steps instead of one SQL?
    //
    // When a user QUOTES a message in WeChat, the reply's content JSON contains:
    //   ref_msg.message_item.create_time_ms = the quoted message's WeChat-assigned timestamp
    //
    // Our sentTime is Date.now() (our server clock), which differs from WeChat's clock
    // by a few seconds. We can't reliably match two different clock sources in SQL.
    //
    // So we:
    // 1. Rough filter: SQL uses createTimeMs column (which stores ref_msg timestamp for
    //    incoming messages) with a 10s window to narrow candidates
    // 2. Precise match: parse the raw JSON to get ref_msg.message_item.create_time_ms
    //    and compare with sentTime in JS using a 5s tolerance

    // 1. Recent incoming messages (createTimeMs is a rough filter — it stores ref_msg timestamp)
    const candidates = await db
      .select({ content: messages.content })
      .from(messages)
      .where(
        and(
          eq(messages.botId, botId),
          eq(messages.direction, "in"),
          gte(messages.createTimeMs, sentTime - 10_000),
        )
      )
      .orderBy(desc(messages.id))
      .limit(10);

    // 2. Parse JSON, check ref_msg.message_item.create_time_ms ≈ sentTime
    for (const row of candidates) {
      try {
        const items = JSON.parse(row.content);
        const refMs = items?.[0]?.ref_msg?.message_item?.create_time_ms;
        if (refMs && Math.abs(refMs - sentTime) < 5000) {
          return items[0].text_item?.text || null;
        }
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
