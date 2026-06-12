import { NextResponse } from "next/server";

export async function GET() {
  const hookUrl = process.env.DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no hook" });
  }

  // Check current installed version
  let currentVersion = "0.0.0";
  try {
    const pkg = await import("@tencent-weixin/openclaw-weixin/package.json", {
      with: { type: "json" },
    });
    currentVersion = pkg.default.version;
  } catch {
    // fallback
  }

  // Check latest version on npm
  let latestVersion = "0.0.0";
  try {
    const resp = await fetch(
      "https://registry.npmjs.org/@tencent-weixin/openclaw-weixin/latest",
      { next: { revalidate: 300 } }
    );
    const data = (await resp.json()) as { version: string };
    latestVersion = data.version;
  } catch {
    return NextResponse.json({ ok: false, error: "npm check failed" }, { status: 502 });
  }

  if (currentVersion === latestVersion) {
    return NextResponse.json({ ok: true, skipped: true, current: currentVersion, latest: latestVersion });
  }

  // Trigger redeploy
  const resp = await fetch(hookUrl, { method: "POST" });
  return NextResponse.json({
    ok: resp.ok,
    deploying: true,
    from: currentVersion,
    to: latestVersion,
  });
}
