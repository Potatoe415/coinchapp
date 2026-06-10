"use client";

import { useEffect, useRef } from "react";
import { submitBotMove, type BotMove } from "@/lib/server/actions-game";
import type { Seat } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import type { BotPunch } from "@/lib/coinche";
import type { BotAction } from "./bot";
import { useBotWorker } from "./useBotWorker";

function toMove(action: BotAction): BotMove {
  if (action.action === "PLAY") return { kind: "play", card: action.card };
  if (action.action === "BID") return { kind: "bid", type: "bid", value: action.value, suit: action.suit };
  return { kind: "bid", type: "pass" };
}

/**
 * When the local client is the host, run the bot whose turn it is: decide from
 * the bot seat's redacted view and submit through the authoritative action.
 * Each move emits a realtime tick, which re-runs this effect for the next bot.
 */
export function useBotRunner(gameId: string, gv: GameView | null, refetch: () => Promise<void>): void {
  const busyRef = useRef(false);
  const decide = useBotWorker(gv?.settings.botPunch as BotPunch | undefined);

  useEffect(() => {
    if (!gv || !gv.isHost || !gv.view) return;
    const view = gv.view;
    const active = view.phase === "bidding" || view.phase === "playing";
    if (!active) return;
    const turn = view.turn;
    const botView = gv.botViews?.[turn];
    if (!botView || busyRef.current) return;

    let cancelled = false;
    void (async () => {
      busyRef.current = true;
      try {
        const action = await decide(botView);
        if (cancelled) return;
        await submitBotMove(gameId, turn as Seat, toMove(action));
        if (!cancelled) await refetch();
      } catch {
        // Host may have changed or another tick already advanced the state;
        // the next realtime tick re-evaluates whose turn it is.
      } finally {
        busyRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, gv, refetch, decide]);
}
