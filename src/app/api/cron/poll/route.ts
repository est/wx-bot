import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { pollWorkflow } from "@/workflows/poll";

export async function GET() {
  await start(pollWorkflow, []);
  return NextResponse.json({ ok: true, message: "poll workflow started/idle" });
}
