import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
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
    // Incoming message quoting the webhook message.
    // createTimeMs = ref_msg.message_item.create_time_ms ≈ sentTime
    const reply = await db.query.messages.findFirst({
      where: and(
        eq(messages.botId, botId),
        eq(messages.direction, "in"),
        sql`abs(${messages.createTimeMs} - ${sentTime}) < 5000`,
      ),
      columns: { content: true },
      orderBy: (t, { desc }) => desc(t.id),
    });

    if (!reply) return null;
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
