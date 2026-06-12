import { fetchUpdates, updateGetUpdatesBuf, getBotUpdateBuf } from "./adapter";
import type { GetUpdatesResp } from "./client";

export async function* pollUpdates(botId: string, signal?: AbortSignal) {
  let buf: string | undefined;

  try {
    buf = await getBotUpdateBuf(botId);
  } catch {
    // Bot not found or not configured
  }

  while (!signal?.aborted) {
    try {
      const resp: GetUpdatesResp = await fetchUpdates(botId, buf);
      if (resp.get_updates_buf) {
        buf = resp.get_updates_buf;
        await updateGetUpdatesBuf(botId, resp.get_updates_buf);
      }
      if (resp.msgs?.length) {
        yield resp.msgs;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") break;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
