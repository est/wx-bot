import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth/session";
import { sessionOptions } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );

    if (!session.userId) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
