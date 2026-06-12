import { NextRequest } from "next/server";
import { requireSession, requireBotOwner } from "@/lib/auth/guard";
import { pollUpdates } from "@/lib/weixin/stream";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { botId } = await params;
  const ownership = await requireBotOwner(botId, auth.userId);
  if ("error" in ownership) return ownership.error;

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
          const sanitized = msgs.map((msg) => ({
            message_id: msg.message_id,
            from_user_id: msg.from_user_id,
            to_user_id: msg.to_user_id,
            message_type: msg.message_type,
            message_state: msg.message_state,
            context_token: msg.context_token,
            create_time_ms: msg.create_time_ms,
            item_list: msg.item_list,
          }));
          const data = `data: ${JSON.stringify(sanitized)}\n\n`;
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
