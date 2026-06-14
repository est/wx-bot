import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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

  const now = Math.floor(Date.now() / 1000);
  if (data.exp < now) {
    return NextResponse.json({ text: null, error: "seal expired" });
  }

  const { botId, toUserId } = data;
  const waitfor = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("waitfor")) || 0, 0),
    30
  );

  async function checkReply() {
    // Latest outgoing message to this user — createdAt is the DB insertion timestamp
    const sentMsg = await db.query.messages.findFirst({
      where: and(
        eq(messages.botId, botId),
        eq(messages.toUserId, toUserId),
        eq(messages.direction, "out")
      ),
      orderBy: (t, { desc }) => desc(t.id),
      columns: { createdAt: true },
    });

    if (!sentMsg) return null;
    const sentAt = sentMsg.createdAt.getTime();

    // Incoming message quoting that sent message
    // createTimeMs stores ref_msg.message_item.create_time_ms (ms since epoch)
    // Match against outgoing createdAt (also ms since epoch), allow 5s tolerance
    const reply = await db.query.messages.findFirst({
      where: and(
        eq(messages.botId, botId),
        eq(messages.direction, "in"),
        sql`abs(${messages.createTimeMs} - ${sentAt}) < 5000`
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
