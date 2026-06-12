import { NextResponse } from "next/server";
import { generateLoginOptions } from "@/lib/auth/webauthn";

export async function GET() {
  try {
    const options = await generateLoginOptions();
    return NextResponse.json(options);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
