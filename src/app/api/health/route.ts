import { NextResponse } from "next/server";

export async function GET() {
  let version = "unknown";
  try {
    const pkg = await import("@tencent-weixin/openclaw-weixin/package.json");
    version = pkg.version;
  } catch {
    // ignore
  }

  return NextResponse.json({ status: "ok", version });
}
