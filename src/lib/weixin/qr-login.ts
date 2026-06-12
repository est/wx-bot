import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { apiPostFetch, apiGetFetch } from "./client";

const FIXED_BASE_URL = "https://ilinkai.weixin.qq.com";
const DEFAULT_BOT_TYPE = "3";
const QR_LONG_POLL_TIMEOUT_MS = 35_000;

type QrLoginSession = {
  id: string;
  qrcode: string;
  qrcodeUrl: string;
  startedAt: number;
  botType: string;
};

const loginSessions = new Map<string, QrLoginSession>();

export async function startQrLogin(botType = DEFAULT_BOT_TYPE) {
  const allBots = await db.query.bots.findMany();
  const localTokens = allBots.filter((b) => b.token).map((b) => b.token!);

  const rawText = await apiPostFetch({
    baseUrl: FIXED_BASE_URL,
    endpoint: `ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`,
    body: JSON.stringify({ local_token_list: localTokens }),
    label: "fetchQRCode",
  });

  const resp = JSON.parse(rawText) as {
    qrcode: string;
    qrcode_img_content: string;
  };
  const sessionId = randomUUID();

  loginSessions.set(sessionId, {
    id: sessionId,
    qrcode: resp.qrcode,
    qrcodeUrl: resp.qrcode_img_content,
    startedAt: Date.now(),
    botType,
  });

  return { sessionId, qrcodeUrl: resp.qrcode_img_content };
}

export async function pollQrLogin(sessionId: string) {
  const session = loginSessions.get(sessionId);
  if (!session)
    return { status: "expired" as const, message: "会话不存在或已过期" };
  if (Date.now() - session.startedAt > 5 * 60_000) {
    loginSessions.delete(sessionId);
    return { status: "expired" as const, message: "二维码已过期" };
  }

  const rawText = await apiGetFetch({
    baseUrl: FIXED_BASE_URL,
    endpoint: `ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(session.qrcode)}`,
    timeoutMs: QR_LONG_POLL_TIMEOUT_MS,
    label: "pollQRStatus",
  });

  const resp = JSON.parse(rawText) as {
    status: string;
    bot_token?: string;
    ilink_bot_id?: string;
    ilink_user_id?: string;
    baseurl?: string;
    redirect_host?: string;
  };

  switch (resp.status) {
    case "confirmed":
      loginSessions.delete(sessionId);
      return {
        status: "confirmed" as const,
        token: resp.bot_token,
        accountId: resp.ilink_bot_id,
        userId: resp.ilink_user_id,
        baseUrl: resp.baseurl ?? FIXED_BASE_URL,
      };
    case "binded_redirect":
      return {
        status: "already_connected" as const,
        message: "该 Bot 已绑定",
      };
    case "scaned":
      return { status: "scaned" as const, message: "已扫码，请在手机上确认" };
    case "scaned_but_redirect":
      return { status: "scaned" as const, message: "已扫码，正在重定向..." };
    case "expired":
      loginSessions.delete(sessionId);
      return { status: "expired" as const, message: "二维码已过期" };
    default:
      return { status: "wait" as const, message: "等待扫码..." };
  }
}
