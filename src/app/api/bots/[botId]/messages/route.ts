import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { sendTextMessage } from "@/lib/weixin/adapter";

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

    const { toUserId, text, contextToken } = (await req.json()) as {
      toUserId: string;
      text: string;
      contextToken?: string;
    };

    if (!toUserId || !text) {
      return NextResponse.json(
        { error: "Missing toUserId or text" },
        { status: 400 }
      );
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
