import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sendMediaMessage } from "@/lib/weixin/adapter";
import type { MessageItem } from "@/lib/weixin/client";

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
    const { toUserId, mediaRef, mediaType, contextToken } = (await req.json()) as {
      toUserId: string;
      mediaRef: {
        encrypt_query_param?: string;
        aes_key?: string;
        encrypt_type?: number;
        full_url?: string;
      };
      mediaType: number;
      contextToken?: string;
    };

    const item: MessageItem = {
      type: mediaType,
    };

    if (mediaType === 2) {
      item.image_item = { cdn_media: mediaRef };
    } else if (mediaType === 3) {
      item.voice_item = { cdn_media: mediaRef };
    } else if (mediaType === 4) {
      item.file_item = { cdn_media: mediaRef };
    } else if (mediaType === 5) {
      item.video_item = { cdn_media: mediaRef };
    }

    await sendMediaMessage(botId, {
      toUserId,
      contextToken,
      itemList: [item],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
