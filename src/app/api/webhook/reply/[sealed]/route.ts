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
    console.log("[webhook-reply] bad seal");
    return NextResponse.json({ text: null, error: "bad seal" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (data.exp < now) {
    console.log(`[webhook-reply] expired: exp=${data.exp} now=${now} diff=${data.exp - now}s`);
    return NextResponse.json({ text: null, error: "seal expired" });
  }

  const { botId, toUserId } = data;
  const waitfor = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("waitfor")) || 0, 0),
    30
  );

  console.log(`[webhook-reply] botId=${botId} toUserId=${toUserId} waitfor=${waitfor}`);

  async function checkReply() {
    const sentMsg = await db.query.messages.findFirst({
      where: and(
        eq(messages.botId, botId),
        eq(messages.toUserId, toUserId),
        eq(messages.direction, "out")
      ),
      orderBy: (t, { desc }) => desc(t.id),
      columns: { id: true, createdAt: true, createTimeMs: true },
    });

    if (!sentMsg) {
      console.log("[webhook-reply] no outgoing message found");
      return null;
    }
    const sentAt = sentMsg.createdAt.getTime();
    console.log(`[webhook-reply] latest outgoing: id=${sentMsg.id} createdAt=${sentAt} createTimeMs=${sentMsg.createTimeMs}`);

    const reply = await db.query.messages.findFirst({
      where: and(
        eq(messages.botId, botId),
        eq(messages.direction, "in"),
        sql`abs(${messages.createTimeMs} - ${sentAt}) < 5000`
      ),
      columns: { id: true, createTimeMs: true, content: true },
      orderBy: (t, { desc }) => desc(t.id),
    });

    if (!reply) {
      console.log("[webhook-reply] no matching incoming message");
      return null;
    }

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
