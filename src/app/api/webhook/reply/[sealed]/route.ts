import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { unsealWebhook } from "@/lib/seal";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sealed: string }> }
) {
  const { sealed } = await params;
  const data = unsealWebhook(sealed);
  if (!data) {
    console.log('[webhook-reply] bad seal')
    return NextResponse.json({ text: null, error: "bad seal" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (data.exp < now) {
    console.log(`[webhook-reply] expired ${data.exp}`)
    return NextResponse.json({ text: null, error: "seal expired" });
  }

  const { botId, sentCreate } = data;
  const waitfor = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("waitfor")) || 0, 0),
    30
  );

  console.log(`[webhook-reply] botId=${botId} sentCreate=${sentCreate} waitfor=${waitfor}`);

  async function checkReply() {
    const msg = await db.query.messages.findFirst({
      where: and(
        eq(messages.botId, botId),
        eq(messages.direction, "in"),
        eq(messages.createTimeMs, sentCreate)
      ),
      columns: { content: true },
    });
    if (!msg) return null;
    try {
      const items = JSON.parse(msg.content);
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
    return NextResponse.json({'text': null}, { status: 200 });
  }

  const deadline = Date.now() + waitfor * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    const reply = await checkReply();
    if (reply) {
      return NextResponse.json({ text: reply });
    }
  }

  return NextResponse.json({'text': null}, { status: 200 });
}
