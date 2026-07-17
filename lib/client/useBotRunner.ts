"use client";

import { useEffect, useRef } from "react";
import { submitBotMove } from "@/lib/server/actions-game";
import type { BotMove } from "@/lib/server/game-dispatch";
import type { Seat } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import type { BotPunch } from "@/lib/coinche";
import type { PlayerView as CoinchePlayerView } from "@/lib/coinche";
import type { PlayerView as BouillaPlayerView } from "@/lib/bouilla";
import { decideBouillaAction, type BouillaBotAction } from "./bouillaEngineAdapter";
import type { BotAction } from "./bot";
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

/**
 * When the local client is the host, run the bot whose turn it is: decide from
 * the bot seat's redacted view and submit through the authoritative action.
 * Each move emits a realtime tick, which re-runs this effect for the next bot.
 */
export function useBotRunner(
  gameId: string,
  gv: GameView | null,
  refetch: () => Promise<void>,
  notify: () => void,
): void {
  const busyRef = useRef(false);
  const decideCoinche = useBotWorker(gv?.settings.botPunch as BotPunch | undefined);

  useEffect(() => {
    if (!gv || !gv.isHost || !gv.view) return;
    const view = gv.view;
    if (!isActiveTurn(gv.gameType, view.phase)) return;
    const turn = view.turn;
    const botView = gv.botViews?.[turn];
    if (!botView || busyRef.current) return;

    let cancelled = false;
    void (async () => {
      busyRef.current = true;
      // TEMP diagnostic: pinpointing an intermittent ~5s bot delay report. Remove once resolved.
      const t0 = performance.now();
      try {
        const action =
          gv.gameType === "bouilla"
            ? await decideBouillaAction(botView as BouillaPlayerView)
            : await decideCoinche(botView as CoinchePlayerView);
        if (cancelled) return;
        const t1 = performance.now();
        await submitBotMove(gameId, turn as Seat, toMove(action));
        const t2 = performance.now();
        if (!cancelled) {
          notify();
          await refetch();
          const t3 = performance.now();
          console.debug(
            `[bot] seat ${turn} decide=${Math.round(t1 - t0)}ms submit=${Math.round(t2 - t1)}ms refetch=${Math.round(t3 - t2)}ms total=${Math.round(t3 - t0)}ms`,
          );
        }
      } catch {
        // Host may have changed, or a version conflict means another actor
        // already advanced the state (see repo.ts updateVersioned). Refetch
        // now instead of waiting for a tick that may never come.
        if (!cancelled) await refetch();
      } finally {
        busyRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, gv, refetch, decideCoinche, notify]);
}
