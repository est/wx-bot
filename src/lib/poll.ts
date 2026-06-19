import { db } from "@/lib/db";
import { bots, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { send } from "@vercel/queue";
import { fetchUpdates, notifyStart, updateGetUpdatesBuf } from "@/lib/weixin/adapter";

const ACTIVE_THRESHOLD_MS = 30_000;
const POLL_INTERVAL_SEC = 120;
const SESSION_EXPIRED_ERRCODE = -14;

export async function ensurePollChain() {
  await send("poll", {}, {
    delaySeconds: 0,
    idempotencyKey: `poll-${Math.floor(Date.now() / (POLL_INTERVAL_SEC * 1000))}`,
  });
}

export async function pollAllBots() {
  const allBots = await db.query.bots.findMany({
    where: eq(bots.status, "active"),
  });

  const now = Date.now();
  let polled = 0;
  let skipped = 0;

  for (const bot of allBots) {
    if (bot.updatedAt && now - new Date(bot.updatedAt).getTime() < ACTIVE_THRESHOLD_MS) {
      skipped++;
      continue;
    }

    try {
      // Notify server this bot is alive (keeps session active)
      await notifyStart(bot.id);

      const buf = bot.getUpdatesBuf || undefined;
      const resp = await fetchUpdates(bot.id, buf);

      // Session expired — clear buf so next poll starts fresh
      if (resp.errcode === SESSION_EXPIRED_ERRCODE) {
        console.log(`[poll] Bot ${bot.id} session expired (errcode -14), clearing buf`);
        await updateGetUpdatesBuf(bot.id, "");
        continue;
      }

      if (resp.get_updates_buf) {
        await updateGetUpdatesBuf(bot.id, resp.get_updates_buf);
      }

      if (resp.msgs?.length) {
        for (const msg of resp.msgs) {
          const content = JSON.stringify(msg.item_list || []);
          const fromUserId = msg.from_user_id || "";
          const toUserId = msg.to_user_id || "";
          const refCreateMs = msg.item_list?.[0]?.ref_msg?.message_item?.create_time_ms;

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
            createTimeMs: refCreateMs || msg.create_time_ms || null,
          });
        }
      }

      polled++;
    } catch (err) {
      console.error(`[poll] Bot ${bot.id} failed:`, err);
    }
  }

  console.log(`[poll] polled=${polled} skipped=${skipped} total=${allBots.length}`);
  return { polled, skipped, total: allBots.length };
}
