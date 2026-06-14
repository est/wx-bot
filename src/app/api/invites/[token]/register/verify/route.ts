import { NextRequest, NextResponse } from "next/server";
import { verifyInviteRegister } from "@/lib/auth/webauthn";
import { getOriginFromRequest } from "@/lib/auth/webauthn";

export async function POST(req: NextRequest) {
  const origin = getOriginFromRequest(req);
  const body = await req.json();

  if (!body.response) {
    return NextResponse.json({ error: "Missing registration response" }, { status: 400 });
  }

  try {
    const result = await verifyInviteRegister(origin, body.response);
    return NextResponse.json({ ok: true, userId: result.userId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
