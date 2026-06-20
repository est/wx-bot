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
    // Why two steps?
    //
    // When a user QUOTES a message in WeChat, the reply's content JSON contains:
    //   ref_msg.message_item.create_time_ms = the quoted message's WeChat-assigned timestamp
    //
    // Our sentTime is Date.now() (our server clock), which differs from WeChat's clock
    // by a few seconds. We can't reliably match two different clock sources in SQL.
    //
    // So we:
    // 1. Rough filter: SQL uses createTimeMs column (which stores ref_msg timestamp for
    //    incoming messages) with a 5s window to narrow candidates
    // 2. Precise match: parse the raw JSON, sort candidates by how close
    //    ref_msg.message_item.create_time_ms is to sentTime, return the closest

    // 1. Recent incoming messages (createTimeMs is a rough filter — it stores ref_msg timestamp)
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

    // 2. Sort by closest ref_msg.create_time_ms to sentTime
    const parsed = candidates
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

    return parsed[0]?.text || null;
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
