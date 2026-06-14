import { sleep } from "workflow";
import { pollAllBots } from "./poll-step";

export async function pollWorkflow() {
  "use workflow";
  while (true) {
    await pollAllBots();
    await sleep("2 minutes");
  }
}
