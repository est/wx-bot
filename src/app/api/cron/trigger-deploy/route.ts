import { NextResponse } from "next/server";

export async function GET() {
  const hookUrl = process.env.DEPLOY_HOOK_URL;

  if (!hookUrl) {
    return NextResponse.json(
      { triggered: false, error: "DEPLOY_HOOK_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const resp = await fetch(hookUrl, { method: "POST" });
    return NextResponse.json({ triggered: resp.ok, status: resp.status });
  } catch (err) {
    return NextResponse.json({ triggered: false, error: String(err) }, { status: 500 });
  }
}
