import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { sendTextMessage } from "@/lib/weixin/adapter";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, desc, and, lt } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const { botId } = await params;
    const ownership = await requireBotOwner(botId, auth.userId);
    if ("error" in ownership) return ownership.error;

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 200);
    const before = req.nextUrl.searchParams.get("before");

    const conditions = [eq(messages.botId, botId)];
    if (before) {
      conditions.push(lt(messages.id, Number(before)));
    }

    const rows = await db.query.messages.findMany({
      where: and(...conditions),
      orderBy: desc(messages.id),
      limit,
    });

    // Reverse to chronological order
    rows.reverse();

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        from_user_id: r.fromUserId,
        to_user_id: r.toUserId,
        message_id: r.messageId,
        message_type: r.messageType,
        direction: r.direction,
        context_token: r.contextToken,
        item_list: JSON.parse(r.content),
        response_body: r.responseBody,
        create_time_ms: r.createdAt ? new Date(r.createdAt).getTime() : null,
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const { botId } = await params;
    const ownership = await requireBotOwner(botId, auth.userId);
    if ("error" in ownership) return ownership.error;

    const toUserId = ownership.bot.ownerWxUserId;
    if (!toUserId) {
      return NextResponse.json({ error: "Bot not linked to a WeChat user" }, { status: 400 });
    }

    const { text, contextToken } = (await req.json()) as {
      text: string;
      contextToken?: string;
    };

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (text.length > 4096) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    await sendTextMessage(botId, { toUserId, text, contextToken });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
