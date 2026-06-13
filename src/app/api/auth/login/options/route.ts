import { NextRequest, NextResponse } from "next/server";
import { generateLoginOptions } from "@/lib/auth/webauthn";

export async function GET(req: NextRequest) {
  try {
    const credentialId = req.cookies.get("last_credential_id")?.value;
    const options = await generateLoginOptions(credentialId || undefined);
    return NextResponse.json(options);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
