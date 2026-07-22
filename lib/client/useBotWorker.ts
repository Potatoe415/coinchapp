"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BotPunch, PlayerView } from "@/lib/coinche";
import { DEFAULT_BOT_THINK_MS } from "@/lib/supabase/types";
import { chooseClientAction, type BotAction, type BotOptions } from "./bot";
import type { BotWorkerRequest, BotWorkerResponse } from "./botWorker";

/**
 * If the worker stays silent this long for a given request, give up on that
 * one request and resolve the move on the main thread instead - but keep
 * routing future requests to the worker (see `onmessage`/`watchdogMs` usage
 * below): a single slow reply (GC pause, one-off CPU contention on the host's
 * device) must not permanently downgrade every remaining bot turn of the game
 * to blocking main-thread computation. Only a genuine `worker.onerror` (the
 * worker itself crashed) marks it dead for good. Comfortably above the ISMCTS
 * play budget so a healthy worker (even slow to spin up in dev) is never
 * wrongly abandoned - scales with the configured `timeBudgetMs` (see
 * `watchdogFor` below) since that budget itself can go up to 4s (`GameSettings.botThinkMs`).
 */
const WATCHDOG_MARGIN_MS = 3000;
const WATCHDOG_FLOOR_MS = 4000;

function watchdogFor(timeBudgetMs: number): number {
  return Math.max(WATCHDOG_FLOOR_MS, timeBudgetMs + WATCHDOG_MARGIN_MS);
}

interface Pending {
  view: PlayerView;
  options: BotOptions;
  timer: ReturnType<typeof setTimeout>;
  resolve: (action: BotAction) => void;
}

/**
 * Drives the bot brain. Bidding is a cheap heuristic and always runs on the
 * main thread. The time-boxed ISMCTS play search runs in a Web Worker so it
 * never blocks rendering, with a watchdog + error fallback so a broken or
 * unresponsive worker can never freeze the game.
 */
export function useBotWorker(
  punch?: BotPunch,
  timeBudgetMs: number = DEFAULT_BOT_THINK_MS,
): (view: PlayerView) => Promise<BotAction> {
  const workerRef = useRef<Worker | null>(null);
  const deadRef = useRef(false);
  const pendingRef = useRef(new Map<number, Pending>());
  const nextIdRef = useRef(0);
  const optionsRef = useRef<BotOptions>({ punch, timeBudgetMs });
  useEffect(() => {
    optionsRef.current = { punch, timeBudgetMs };
  }, [punch, timeBudgetMs]);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const pending = pendingRef.current;
    let worker: Worker;
    try {
      worker = new Worker(new URL("./botWorker.ts", import.meta.url), { type: "module" });
    } catch {
      deadRef.current = true;
      return;
    }
    worker.onmessage = (event: MessageEvent<BotWorkerResponse>) => {
      const { id, action, error } = event.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      clearTimeout(entry.timer);
      entry.resolve(error !== undefined ? chooseClientAction(entry.view, entry.options) : action);
    };
    worker.onerror = () => abandonWorker(deadRef, pending, "error");
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      for (const entry of pending.values()) clearTimeout(entry.timer);
      pending.clear();
    };
  }, []);

  return useCallback((view: PlayerView): Promise<BotAction> => {
    const worker = workerRef.current;
    const options = optionsRef.current;
    if (view.phase !== "playing" || !worker || deadRef.current) {
      return Promise.resolve().then(() => chooseClientAction(view, options));
    }
    const id = nextIdRef.current++;
    return new Promise<BotAction>((resolve) => {
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        console.warn("[bot] worker slow to reply; falling back to main thread for this move only");
        resolve(chooseClientAction(view, options));
      }, watchdogFor(options.timeBudgetMs ?? DEFAULT_BOT_THINK_MS));
      pendingRef.current.set(id, { view, options, timer, resolve });
      worker.postMessage({ id, view, options } satisfies BotWorkerRequest);
    });
  }, []);
}

/** Mark the worker dead and immediately resolve every in-flight move on the main thread. */
function abandonWorker(
  deadRef: { current: boolean },
  pending: Map<number, Pending>,
  reason: string,
): void {
  if (deadRef.current) return;
  deadRef.current = true;
  console.warn(`[bot] worker ${reason}; falling back to main thread`);
  for (const entry of [...pending.values()]) {
    clearTimeout(entry.timer);
    entry.resolve(chooseClientAction(entry.view, entry.options));
  }
  pending.clear();
}
