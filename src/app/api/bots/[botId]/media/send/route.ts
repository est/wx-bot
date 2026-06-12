import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { sendMediaMessage } from "@/lib/weixin/adapter";
import type { MessageItem } from "@/lib/weixin/client";

const VALID_MEDIA_TYPES = [2, 3, 4, 5];

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

    if (!toUserId || !mediaRef || !mediaType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!VALID_MEDIA_TYPES.includes(mediaType)) {
      return NextResponse.json(
        { error: "Invalid mediaType" },
        { status: 400 }
      );
    }

    const item: MessageItem = { type: mediaType };
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
