import { NextResponse } from "next/server";
import { generateRegisterOptions } from "@/lib/auth/webauthn";

export async function GET() {
  try {
    const { options } = await generateRegisterOptions("User");
    return NextResponse.json(options);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
