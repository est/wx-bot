import { NextRequest, NextResponse } from "next/server";
import { verifyLogin } from "@/lib/auth/webauthn";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuthenticationResponseJSON;
    const userId = await verifyLogin(body);
    return NextResponse.json({ verified: true, userId });
  } catch (err) {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 400 }
    );
  }
}
