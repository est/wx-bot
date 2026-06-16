import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { unsealWebhook } from "@/lib/seal";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sealed: string }> }
) {
  const { sealed } = await params;
  const data = unsealWebhook(sealed);
  if (!data) {
    console.log("[webhook-reply] bad seal");
    return NextResponse.json({ text: null, error: "bad seal" });
  }

  const { botId, sentTime } = data;
  const waitfor = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("waitfor")) || 0, 0),
    30
  );

  console.log(`[webhook-reply] botId=${botId} sentTime=${sentTime} waitfor=${waitfor}`);

  async function checkReply() {
    // Find incoming message quoting an outgoing message sent near sentTime
    const reply = await db
      .select({ id: messages.id, createTimeMs: messages.createTimeMs, content: messages.content })
      .from(messages)
      .where(
        and(
          eq(messages.botId, botId),
          eq(messages.direction, "in"),
          sql`${messages.createTimeMs} IN (
            SELECT create_time_ms FROM messages
            WHERE bot_id = ${botId}
              AND direction = 'out'
              AND created_at >= ${new Date(sentTime - 10_000)}
              AND create_time_ms IS NOT NULL
            ORDER BY id DESC LIMIT 10
          )`
        )
      )
      .orderBy((t) => sql`${t.id} DESC`)
      .limit(1);

    if (!reply) return null;
    console.log(`[webhook-reply] match: id=${reply.id} createTimeMs=${reply.createTimeMs}`);
    try {
      const items = JSON.parse(reply.content);
      return items?.[0]?.text_item?.text || null;
    } catch {
      return null;
    }
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
