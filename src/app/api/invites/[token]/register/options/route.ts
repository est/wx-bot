import { NextRequest, NextResponse } from "next/server";
import { generateInviteRegisterOptions } from "@/lib/auth/webauthn";
import { getOriginFromRequest } from "@/lib/auth/webauthn";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const origin = getOriginFromRequest(req);

  try {
    const result = await generateInviteRegisterOptions(origin, token);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
