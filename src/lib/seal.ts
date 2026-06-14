import { sealData, unsealData } from "iron-session";

const SEAL_SECRET =
  process.env.VERCEL_PROJECT_ID || "wx-bot-local-dev-seal-fallback";

export async function sealWebhook(data: {
  botId: string;
  toUserId: string;
  sentCreate: number;
  exp: number;
}): Promise<string> {
  return sealData(data, { password: SEAL_SECRET });
}

export async function unsealWebhook(token: string): Promise<{
  botId: string;
  toUserId: string;
  sentCreate: number;
  exp: number;
} | null> {
  try {
    return await unsealData(token, { password: SEAL_SECRET });
  } catch {
    return null;
  }
}
