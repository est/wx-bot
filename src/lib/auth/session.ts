import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  challenge?: string;
  webauthnUserId?: string;
  userName?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "fallback-secret-at-least-32-characters",
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
