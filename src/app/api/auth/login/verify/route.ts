import { NextRequest, NextResponse } from "next/server";
import { verifyLogin, getOriginFromRequest } from "@/lib/auth/webauthn";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuthenticationResponseJSON;
    const origin = getOriginFromRequest(req);
    const { userId, credentialId } = await verifyLogin(origin, body);

    const response = NextResponse.json({ verified: true, userId });
    response.cookies.set("last_credential_id", credentialId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Login failed" }, { status: 400 });
  }
}
