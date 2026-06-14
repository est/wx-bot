import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passkeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { unsealData } from "iron-session";
import { sessionOptions } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const data = await unsealData<{ userId: string; exp?: number }>(token, {
      password: sessionOptions.password,
    });

    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ valid: false, reason: "邀请链接已过期" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, data.userId),
    });
    if (!user) {
      return NextResponse.json({ valid: false, reason: "用户不存在" });
    }

    const userPasskeys = await db.query.passkeys.findMany({
      where: eq(passkeys.userId, data.userId),
    });

    return NextResponse.json({
      valid: true,
      userName: user.name,
      passkeyCount: userPasskeys.length,
    });
  } catch {
    return NextResponse.json({ valid: false, reason: "无效的邀请链接" });
  }
}
