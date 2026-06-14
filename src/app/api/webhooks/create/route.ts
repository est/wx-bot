import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { botWebhooks } from "@/lib/db/schema";
import { randomBytes } from "node:crypto";

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const botId = req.nextUrl.searchParams.get("botId");
  if (!botId) {
    return NextResponse.json({ error: "Missing botId" }, { status: 400 });
  }

  const ownership = await requireBotOwner(botId, auth.userId);
  if ("error" in ownership) return ownership.error;

  const id = randomBytes(6).toString("base64url");

  await db.insert(botWebhooks).values({ id, botId });

  return NextResponse.json({ id });
}
