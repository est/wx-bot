import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";
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
    // Find recent outgoing messages from this bot (sentTime - 10s buffer)
    const recentOut = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(
        and(
          eq(messages.botId, botId),
          eq(messages.direction, "out"),
          gte(messages.createdAt, new Date(sentTime - 10_000))
        )
      )
      .orderBy(desc(messages.id))
      .limit(10);

    if (!recentOut.length) {
      console.log("[webhook-reply] no outgoing messages found");
      return null;
    }

    // Find incoming message quoting any of these outgoing messages
    for (const out of recentOut) {
      const outAt = out.createdAt.getTime();
      const reply = await db.query.messages.findFirst({
        where: and(
          eq(messages.botId, botId),
          eq(messages.direction, "in"),
          sql`abs(${messages.createTimeMs} - ${outAt}) < 5000`
        ),
        columns: { id: true, createTimeMs: true, content: true },
        orderBy: (t, { desc }) => desc(t.id),
      });

      if (reply) {
        console.log(`[webhook-reply] match: replyId=${reply.id} createTimeMs=${reply.createTimeMs}`);
        try {
          const items = JSON.parse(reply.content);
          const text = items?.[0]?.text_item?.text || null;
          if (text) return text;
        } catch {}
      }
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
