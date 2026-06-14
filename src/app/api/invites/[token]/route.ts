import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invites, users, passkeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await db.query.invites.findFirst({
    where: eq(invites.token, token),
  });

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "邀请链接不存在" });
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ valid: false, reason: "邀请链接已过期" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, invite.userId),
  });

  const passkeyCount = await db.query.passkeys.findMany({
    where: eq(passkeys.userId, invite.userId),
  });

  return NextResponse.json({
    valid: true,
    userName: user?.name || "unknown",
    passkeyCount: passkeyCount.length,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { token } = await params;

  const invite = await db.query.invites.findFirst({
    where: and(eq(invites.id, token), eq(invites.userId, auth.userId)),
  });

  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(invites).where(eq(invites.id, token));
  return NextResponse.json({ ok: true });
}
