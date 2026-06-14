import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { unsealWebhook } from "@/lib/seal";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sealed: string }> }
) {
  const { sealed } = await params;
  const data = unsealWebhook(sealed);
  if (!data) {
    console.log("[webhook-reply] invalid seal");
    return new NextResponse(null, { status: 204 });
  }

  const now = Math.floor(Date.now() / 1000);
  if (data.exp < now) {
    console.log("[webhook-reply] expired");
    return new NextResponse(null, { status: 204 });
  }

  const { botId, sentCreate } = data;
  const waitfor = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("waitfor")) || 0, 0),
    30
  );

  console.log(`[webhook-reply] botId=${botId} sentCreate=${sentCreate} waitfor=${waitfor}`);

  // Debug: check what create_time_ms values exist for this bot
  const debugRows = await db
    .select({
      id: messages.id,
      direction: messages.direction,
      createTimeMs: messages.createTimeMs,
      refCreate: sql`json_extract(${messages.content}, '$[0].ref_msg.message_item.create_time_ms')`,
      contentSnippet: sql<string>`substr(${messages.content}, 1, 300)`,
    })
    .from(messages)
    .where(eq(messages.botId, botId))
    .orderBy(sql`${messages.id} DESC`)
    .limit(5);
  console.log("[webhook-reply] recent messages:", JSON.stringify(debugRows, null, 2));

  async function checkReply() {
    const rows = await db
      .select({ content: messages.content })
      .from(messages)
      .where(
        and(
          eq(messages.botId, botId),
          eq(messages.direction, "in"),
          sql`json_extract(${messages.content}, '$[0].ref_msg.message_item.create_time_ms') = ${sentCreate}`
        )
      )
      .limit(1);
    console.log(`[webhook-reply] json_extract match: ${rows.length} rows`);
    if (!rows.length) return null;
    try {
      const items = JSON.parse(rows[0].content);
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
    return new NextResponse(null, { status: 204 });
  }

  const deadline = Date.now() + waitfor * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    const reply = await checkReply();
    if (reply) {
      return NextResponse.json({ text: reply });
    }
  }

  return new NextResponse(null, { status: 204 });
}
