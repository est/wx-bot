import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";

export interface SessionData {
  userId?: string;
  challenge?: string;
  webauthnUserId?: string;
  userName?: string;
}

function getSessionPassword() {
  const pw = process.env.SESSION_SECRET;
  if (pw) return pw;
  // Auto-generate from VERCEL_URL so sessions persist across requests
  // but invalidate on redeploy (acceptable for personal projects)
  const base = process.env.VERCEL_URL || "localhost";
  return createHash("sha256").update(`wx-bot:${base}`).digest("hex").slice(0, 32);
}

export const sessionOptions = {
  password: getSessionPassword(),
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
