import { NextResponse } from "next/server";

export async function POST() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, reason: "QSTASH_TOKEN not set" });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const resp = await fetch("https://qstash.upstash.io/v2/publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: `${baseUrl}/api/cron/poll`,
      body: "{}",
    }),
  });

  return NextResponse.json({ ok: resp.ok, status: resp.status });
}
