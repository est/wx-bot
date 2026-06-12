import { NextRequest, NextResponse } from "next/server";
import { verifyRegister } from "@/lib/auth/webauthn";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegistrationResponseJSON;
    const userId = await verifyRegister(body);
    return NextResponse.json({ verified: true, userId });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 400 }
    );
  }
}
