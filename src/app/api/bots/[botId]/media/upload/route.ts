import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { uploadMedia } from "@/lib/weixin/media";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const toUserId = formData.get("toUserId") as string;

    if (!file || !toUserId) {
      return NextResponse.json(
        { error: "Missing file or toUserId" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/quicktime",
      "audio/ogg", "audio/mpeg", "audio/wav",
      "application/pdf", "application/zip",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaRef = await uploadMedia(botId, buffer, file.type, toUserId);

    return NextResponse.json({ mediaRef });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
