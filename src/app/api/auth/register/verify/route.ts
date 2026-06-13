import { NextRequest, NextResponse } from "next/server";
import { verifyRegister, getOriginFromRequest } from "@/lib/auth/webauthn";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegistrationResponseJSON;
    const origin = getOriginFromRequest(req);
    const { userId, credentialId } = await verifyRegister(origin, body);

    const response = NextResponse.json({ verified: true, userId });
    response.cookies.set("last_credential_id", credentialId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Registration failed" }, { status: 400 });
  }
}
