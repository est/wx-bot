import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  challenge?: string;
  webauthnUserId?: string;
  userName?: string;
  inviteToken?: string;
}

export const sessionOptions = {
  // 这里不要搞什么 SESSION_SECRET 。直接换 VERCEL_DEPLOYMENT_ID
  password: process.env.VERCEL_DEPLOYMENT_ID || "wx-bot-local-dev-secret-fallback-32c",
  cookieName: "wx-bot-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
