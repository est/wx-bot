import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { db } from "@/lib/db";
import { bots, messages } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { fetchUpdates, updateGetUpdatesBuf } from "@/lib/weixin/adapter";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

const ACTIVE_THRESHOLD_MS = 30_000; // 30 seconds
const POLL_INTERVAL_SEC = 120; // 2 minutes
const POLL_INTERVAL_MS = POLL_INTERVAL_SEC * 1000;

async function scheduleNext() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return;

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

  const delaySec = POLL_INTERVAL_SEC;

  await fetch("https://qstash.upstash.io/v2/publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Delay": `${delaySec}s`,
      "Upstash-Deduplication-Id": `poll-next-${Math.floor(Date.now() / POLL_INTERVAL_MS)}`,
      "Upstash-Deduplication-Window": `${delaySec}`,
    },
    body: JSON.stringify({
      url: `${baseUrl}/api/cron/poll`,
      body: "{}",
    }),
  });
}

export async function GET(req: Request) {
  return handlePoll(req);
}

export async function POST(req: Request) {
  return handlePoll(req);
}

async function handlePoll(req: Request) {
  // Verify QStash signature (skip in dev if no keys configured)
  const sig = req.headers.get("upstash-signature");
  if (sig && process.env.QSTASH_CURRENT_SIGNING_KEY) {
    try {
      const body = await req.clone().text();
      const isValid = await receiver.verify({
        signature: sig,
        body,
        url: `${process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"}/api/cron/poll`,
      });
      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }
  }

  // Find all active bots
  const allBots = await db.query.bots.findMany({
    where: eq(bots.status, "active"),
  });

  const now = Date.now();
  let polled = 0;
  let skipped = 0;

  for (const bot of allBots) {
    // Skip bots with active browser connections (updated within 30s)
    if (bot.updatedAt && now - new Date(bot.updatedAt).getTime() < ACTIVE_THRESHOLD_MS) {
      skipped++;
      continue;
    }

    try {
      const buf = bot.getUpdatesBuf || undefined;
      const resp = await fetchUpdates(bot.id, buf);

      if (resp.get_updates_buf) {
        await updateGetUpdatesBuf(bot.id, resp.get_updates_buf);
      }

      if (resp.msgs?.length) {
        // Store messages in DB
        for (const msg of resp.msgs) {
          const content = JSON.stringify(msg.item_list || []);
          const fromUserId = msg.from_user_id || "";
          const toUserId = msg.to_user_id || "";

          await db.insert(messages).values({
            botId: bot.id,
            fromUserId,
            toUserId,
            messageId: msg.message_id ? String(msg.message_id) : null,
            sessionId: msg.session_id || null,
            contextToken: msg.context_token || null,
            direction: msg.message_type === 2 ? "out" : "in",
            messageType: msg.message_type || 0,
            content,
            createTimeMs: msg.create_time_ms || null,
          });
        }
      }

      polled++;
    } catch (err) {
      console.error(`[poll] Bot ${bot.id} failed:`, err);
    }
  }

  // Schedule next poll
  await scheduleNext();

  return NextResponse.json({ ok: true, polled, skipped, total: allBots.length });
}
