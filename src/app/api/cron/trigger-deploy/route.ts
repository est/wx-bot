import { NextResponse } from "next/server";

export async function GET() {
  const hookUrl = process.env.DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const resp = await fetch(hookUrl, { method: "POST" });
  return NextResponse.json({ ok: resp.ok });
}
