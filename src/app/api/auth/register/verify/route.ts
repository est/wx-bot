import { NextRequest, NextResponse } from "next/server";
import { verifyRegister, getOriginFromRequest } from "@/lib/auth/webauthn";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegistrationResponseJSON;
    const origin = getOriginFromRequest(req);
    const userId = await verifyRegister(origin, body);
    return NextResponse.json({ verified: true, userId });
  } catch (err) {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 400 }
    );
  }
}
