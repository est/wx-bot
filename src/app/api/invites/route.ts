import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { sealData } from "iron-session";
import { SEAL_SECRET } from "@/lib/seal";

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const expiresInSeconds = body.expiresInSeconds as number | undefined;

  const data: Record<string, unknown> = { userId: auth.userId };
  if (expiresInSeconds) {
    data.exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  }

  const sealed = await sealData(data, { password: SEAL_SECRET });

  return NextResponse.json({ token: sealed });
}
