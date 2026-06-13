import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import * as WeixinApi from "./client";
import type { MessageItem, GetUploadUrlReq } from "./client";

async function getBotCredentials(botId: string) {
  const bot = await db.query.bots.findFirst({ where: eq(bots.id, botId) });
  if (!bot || !bot.token || !bot.baseUrl) {
    throw new Error(`Bot ${botId} not configured`);
  }
  return { token: bot.token, baseUrl: bot.baseUrl, cdnBaseUrl: bot.cdnBaseUrl };
}

export async function fetchUpdates(botId: string, buf?: string) {
  const { token, baseUrl } = await getBotCredentials(botId);
  return WeixinApi.getUpdates({
    baseUrl,
    token,
    get_updates_buf: buf,
    timeoutMs: 35_000,
  });
}

export async function sendTextMessage(
  botId: string,
  params: {
    toUserId: string;
    text: string;
    contextToken?: string;
  }
) {
  const { token, baseUrl } = await getBotCredentials(botId);
  await WeixinApi.sendMessage({
    baseUrl,
    token,
    body: {
      msg: {
        from_user_id: "",
        to_user_id: params.toUserId,
        client_id: randomUUID(),
        message_type: 2, // BOT
        message_state: 2, // FINISH
        item_list: [{ type: 1, text_item: { text: params.text } }],
        context_token: params.contextToken,
      },
    },
  });
}

export async function getMediaUploadUrl(
  botId: string,
  params: Omit<GetUploadUrlReq, "base_info">
) {
  const { token, baseUrl } = await getBotCredentials(botId);
  return WeixinApi.getUploadUrl({ baseUrl, token, ...params });
}

export async function sendMediaMessage(
  botId: string,
  params: {
    toUserId: string;
    contextToken?: string;
    itemList: MessageItem[];
  }
) {
  const { token, baseUrl } = await getBotCredentials(botId);
  await WeixinApi.sendMessage({
    baseUrl,
    token,
    body: {
      msg: {
        from_user_id: "",
        to_user_id: params.toUserId,
        client_id: randomUUID(),
        message_type: 2, // BOT
        message_state: 2, // FINISH
        item_list: params.itemList,
        context_token: params.contextToken,
      },
    },
  });
}

export async function updateGetUpdatesBuf(botId: string, buf: string) {
  await db
    .update(bots)
    .set({ getUpdatesBuf: buf, updatedAt: new Date() })
    .where(eq(bots.id, botId));
}

export async function sendTypingIndicator(
  botId: string,
  toUserId: string,
  contextToken?: string
) {
  const { token, baseUrl } = await getBotCredentials(botId);
  const config = await WeixinApi.getConfig({
    baseUrl,
    token,
    ilinkUserId: toUserId,
    contextToken,
  });
  if (config.typing_ticket) {
    await WeixinApi.sendTyping({
      baseUrl,
      token,
      body: {
        to_user_id: toUserId,
        typing_ticket: config.typing_ticket as string,
        typing_status: 1,
      },
    });
  }
}

export async function getBotUpdateBuf(botId: string) {
  const bot = await db.query.bots.findFirst({ where: eq(bots.id, botId) });
  return bot?.getUpdatesBuf ?? undefined;
}
