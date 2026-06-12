import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { pollUpdates } from "@/lib/weixin/stream";
import type { WeixinMessage } from "@/lib/weixin/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { botId } = await params;

  const encoder = new TextEncoder();
  let closed = false;
  let pollSignal: AbortController | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const abortController = new AbortController();
      pollSignal = abortController;

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 8000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        abortController.abort();
        try { controller.close(); } catch {}
      }, { once: true });

      try {
        for await (const msgs of pollUpdates(botId, abortController.signal)) {
          if (closed) break;
          const data = `data: ${JSON.stringify(msgs)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err) {
        if (!closed) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`));
        }
      } finally {
        clearInterval(heartbeat);
        if (!closed) {
          try { controller.close(); } catch {}
        }
      }
    },
    cancel() {
      closed = true;
      pollSignal?.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
