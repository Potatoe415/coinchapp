/// <reference lib="webworker" />
import type { PlayerView } from "@/lib/coinche";
import { chooseClientAction, type BotAction } from "./bot";

/**
 * Dedicated Web Worker that runs the bot brain off the UI thread. The host
 * posts a redacted seat view; the worker replies with the chosen action. The
 * heavy part is the play phase (time-boxed ISMCTS up to 800ms), which would
 * otherwise freeze the main thread.
 */
export interface BotWorkerRequest {
  id: number;
  view: PlayerView;
}

export type BotWorkerResponse =
  | { id: number; action: BotAction; error?: undefined }
  | { id: number; action?: undefined; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<BotWorkerRequest>) => {
  const { id, view } = event.data;
  try {
    const action = chooseClientAction(view);
    ctx.postMessage({ id, action } satisfies BotWorkerResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "bot_error";
    ctx.postMessage({ id, error: message } satisfies BotWorkerResponse);
  }
};
