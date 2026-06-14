import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invites, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const rows = await db.query.invites.findMany({
    where: eq(invites.userId, auth.userId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const expiresInSeconds = body.expiresInSeconds as number | undefined;

  const token = randomUUID().replace(/-/g, "").slice(0, 32);
  const now = new Date();
  const expiresAt = expiresInSeconds
    ? new Date(now.getTime() + expiresInSeconds * 1000)
    : null;

  const row = await db.insert(invites).values({
    id: randomUUID(),
    userId: auth.userId,
    token,
    expiresAt,
  }).returning();

  return NextResponse.json(row[0]);
}
