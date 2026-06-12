import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sendTextMessage } from "@/lib/weixin/adapter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = await params;
    const { toUserId, text, contextToken } = (await req.json()) as {
      toUserId: string;
      text: string;
      contextToken?: string;
    };

    await sendTextMessage(botId, { toUserId, text, contextToken });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
