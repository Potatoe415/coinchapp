"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitBotMove } from "@/lib/server/actions-game";
import type { BotMove } from "@/lib/server/game-dispatch";
import type { Seat } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import type { BotPunch } from "@/lib/coinche";
import type { PlayerView as CoinchePlayerView } from "@/lib/coinche";
import type { PlayerView as BouillaPlayerView } from "@/lib/bouilla";
import { DEFAULT_BOT_THINK_MS } from "@/lib/supabase/types";
import { decideBouillaAction, type BouillaBotAction } from "./bouillaEngineAdapter";
import type { BotAction } from "./bot";
import { wait } from "./cardGameDriver";
import { useBotWorker } from "./useBotWorker";

function toMove(action: BotAction | BouillaBotAction): BotMove {
  if (action.action === "PLAY") return { kind: "play", card: action.card };
  if (action.action === "BID") return { kind: "bid", type: "bid", value: action.value, suit: action.suit };
  return { kind: "bid", type: "pass" };
}

/** Is the seat whose turn it is expected to act right now, for the active game type? */
function isActiveTurn(gameType: GameView["gameType"], phase: string): boolean {
  return gameType === "bouilla" ? phase === "playing" : phase === "bidding" || phase === "playing";
}

/** One completed bot turn's timing breakdown, for the in-game debug overlay
 *  (see BotDebugOverlay.tsx). Purely an in-memory diagnostic aid, never persisted. */
export interface BotTimingEntry {
  id: number;
  seat: number;
  /** Time between the previous tracked move finishing and this one's decide
   *  starting: how long the turn took to actually hand off to this bot (render/
   *  effect scheduling lag), or null for the first move tracked this session. */
  handoffMs: number | null;
  decideMs: number;
  submitMs: number;
  refetchMs: number;
  totalMs: number;
}

const MAX_DEBUG_LOG = 30;

/**
 * When the local client is the host, run the bot whose turn it is: decide from
 * the bot seat's redacted view and submit through the authoritative action.
 * Each move emits a realtime tick, which re-runs this effect for the next bot.
 * When `debug` is on, also returns a rolling log of per-phase timings (used by
 * the "Bouilla debug mode" overlay to diagnose slow-bot reports live).
 */
export function useBotRunner(
  gameId: string,
  gv: GameView | null,
  refetch: () => Promise<void>,
  notify: () => void,
  debug = false,
): BotTimingEntry[] {
  // Which turn is currently being decided/submitted, if any. Gates re-entrancy
  // by turn number (not by `gv` object identity): every refetch - including
  // ones the bot's own move triggers via its `game_events` echo or the safety
  // poll - creates a brand-new `gv` reference, which would otherwise re-run
  // this effect and (via cleanup) cancel an in-flight decide for no reason,
  // wasting a full `thinkMs` cycle each time and compounding into multi-
  // second stalls.
  const activeTurnRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const thinkMs = (gv?.settings.botThinkMs as number | undefined) ?? DEFAULT_BOT_THINK_MS;
  const decideCoinche = useBotWorker(gv?.settings.botPunch as BotPunch | undefined, thinkMs);
  const lastFinishedAtRef = useRef<number | null>(null);
  const nextLogIdRef = useRef(0);
  const [log, setLog] = useState<BotTimingEntry[]>([]);

  const recordTiming = useCallback(
    (seat: number, t0: number, t1: number, t2: number, t3: number) => {
      const handoffMs = lastFinishedAtRef.current === null ? null : Math.round(t0 - lastFinishedAtRef.current);
      lastFinishedAtRef.current = t3;
      if (!debug) return;
      console.log(
        `[bot] seat ${seat} handoff=${handoffMs ?? "—"}ms decide=${Math.round(t1 - t0)}ms submit=${Math.round(t2 - t1)}ms refetch=${Math.round(t3 - t2)}ms total=${Math.round(t3 - t0)}ms`,
      );
      const entry: BotTimingEntry = {
        id: nextLogIdRef.current++,
        seat,
        handoffMs,
        decideMs: Math.round(t1 - t0),
        submitMs: Math.round(t2 - t1),
        refetchMs: Math.round(t3 - t2),
        totalMs: Math.round(t3 - t0),
      };
      setLog((prev) => [...prev.slice(-(MAX_DEBUG_LOG - 1)), entry]);
    },
    [debug],
  );

  useEffect(() => {
    mountedRef.current = true;
    activeTurnRef.current = null;
    return () => {
      mountedRef.current = false;
    };
  }, [gameId]);

  useEffect(() => {
    if (!gv || !gv.isHost || !gv.view) return;
    const view = gv.view;
    if (!isActiveTurn(gv.gameType, view.phase)) return;
    const turn = view.turn;
    const botView = gv.botViews?.[turn];
    // Redundant refetch for a turn already being handled: ignore instead of
    // restarting (see activeTurnRef comment above).
    if (!botView || activeTurnRef.current === turn) return;
    activeTurnRef.current = turn;

    void (async () => {
      const t0 = performance.now();
      try {
        // Bouilla's heuristic bot is instant (no search to overlap): pace it with
        // `thinkMs` like the local/ad-hoc driver does, so "reflexion" applies to
        // both games (see GameSettings.botThinkMs).
        const action =
          gv.gameType === "bouilla"
            ? (await Promise.all([decideBouillaAction(botView as BouillaPlayerView), wait(thinkMs)]))[0]
            : await decideCoinche(botView as CoinchePlayerView);
        const t1 = performance.now();
        await submitBotMove(gameId, turn as Seat, toMove(action));
        const t2 = performance.now();
        if (mountedRef.current) {
          notify();
          await refetch();
          recordTiming(turn, t0, t1, t2, performance.now());
        }
      } catch {
        // Host may have changed, or a version conflict means another actor
        // already advanced the state (see repo.ts updateVersioned). Refetch
        // now instead of waiting for a tick that may never come.
        if (mountedRef.current) await refetch();
      } finally {
        if (activeTurnRef.current === turn) activeTurnRef.current = null;
      }
    })();
  }, [gameId, gv, refetch, decideCoinche, notify, thinkMs, recordTiming]);

  return log;
}
