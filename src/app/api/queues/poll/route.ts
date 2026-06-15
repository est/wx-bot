import { handleCallback } from "@vercel/queue";
import { pollAllBots } from "@/lib/poll";

export const POST = handleCallback(async () => {
  await pollAllBots();
});
