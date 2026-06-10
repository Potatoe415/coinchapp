"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BotPunch, PlayerView } from "@/lib/coinche";
import { chooseClientAction, type BotAction } from "./bot";
import type { BotWorkerRequest, BotWorkerResponse } from "./botWorker";

/**
 * If the worker stays silent this long we give up on it: resolve the move on
 * the main thread and stop routing to the worker. Comfortably above the ISMCTS
 * play budget (800ms) so a healthy worker (even slow to spin up in dev) is
 * never wrongly abandoned.
 */
const WATCHDOG_MS = 4000;

interface Pending {
  view: PlayerView;
  timer: ReturnType<typeof setTimeout>;
  resolve: (action: BotAction) => void;
}

/**
 * Drives the bot brain. Bidding is a cheap heuristic and always runs on the
 * main thread. The time-boxed ISMCTS play search runs in a Web Worker so it
 * never blocks rendering, with a watchdog + error fallback so a broken or
 * unresponsive worker can never freeze the game.
 */
export function useBotWorker(punch?: BotPunch): (view: PlayerView) => Promise<BotAction> {
  const workerRef = useRef<Worker | null>(null);
  const deadRef = useRef(false);
  const pendingRef = useRef(new Map<number, Pending>());
  const nextIdRef = useRef(0);
  const punchRef = useRef(punch);
  punchRef.current = punch;

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
      entry.resolve(error !== undefined ? chooseClientAction(entry.view) : action);
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
    if (view.phase !== "playing" || !worker || deadRef.current) {
      return Promise.resolve().then(() => chooseClientAction(view, { punch: punchRef.current }));
    }
    const id = nextIdRef.current++;
    return new Promise<BotAction>((resolve) => {
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        deadRef.current = true;
        console.warn("[bot] worker unresponsive; falling back to main thread");
        resolve(chooseClientAction(view));
      }, WATCHDOG_MS);
      pendingRef.current.set(id, { view, timer, resolve });
      worker.postMessage({ id, view } satisfies BotWorkerRequest);
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
    entry.resolve(chooseClientAction(entry.view));
  }
  pending.clear();
}
