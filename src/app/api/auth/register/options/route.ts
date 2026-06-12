import { NextRequest, NextResponse } from "next/server";
import { generateRegisterOptions } from "@/lib/auth/webauthn";

export async function POST(req: NextRequest) {
  try {
    const { name } = (await req.json()) as { name?: string };
    if (!name || name.trim().length === 0 || name.length > 128) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const { options } = await generateRegisterOptions(name.trim());
    return NextResponse.json(options);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
