import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function requireSession() {
  const session = await getSession();
  if (!session.userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.userId };
}

export async function requireBotOwner(botId: string, userId: string) {
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, botId), eq(bots.userId, userId)),
  });
  if (!bot) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { bot };
}
