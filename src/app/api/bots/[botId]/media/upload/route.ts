import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadMedia } from "@/lib/weixin/media";

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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const toUserId = formData.get("toUserId") as string;

    if (!file || !toUserId) {
      return NextResponse.json(
        { error: "Missing file or toUserId" },
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
