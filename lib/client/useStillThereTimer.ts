"use client";

import { useEffect, useState } from "react";
import { markStillHere } from "@/lib/server/actions-game";
import type { GameView } from "@/lib/server/view";
import { DEFAULT_STILL_THERE_TIMEOUT_SEC, STILL_THERE_POPUP_LEAD_MS } from "@/lib/supabase/types";

export interface StillThereState {
  show: boolean;
  secondsLeft: number;
}

const TICK_MS = 250;
/** Small buffer past the deadline so the server-authoritative check (its own
 *  clock, via `advanceIdleTurns`) has definitely already elapsed by the time
 *  we ask for it. */
const REFETCH_BUFFER_MS = 300;

/** When the countdown banner should show, and when it ends, given the seat's
 *  own miss streak: a fresh seat gets a silent wait before the 5s banner; a
 *  seat that already missed once gets the banner immediately. */
function idleWindow(turnStartedAt: number, missedTurnsInRow: number, stillThereTimeoutSec: number) {
  const showAt =
    missedTurnsInRow >= 1
      ? turnStartedAt
      : turnStartedAt + Math.max(0, stillThereTimeoutSec * 1000 - STILL_THERE_POPUP_LEAD_MS);
  return { showAt, deadlineAt: showAt + STILL_THERE_POPUP_LEAD_MS };
}

/**
 * Client-side half of the "are you still there?" idle-turn timer. The server
 * (`lib/server/idle-timer.ts`) is the actual authority - this only computes
 * when to show the countdown banner from the same `turnStartedAt` the server
 * uses, and proactively refetches right at the deadline so the auto-play/bot
 * conversion feels prompt on the idle player's own screen instead of waiting
 * for the passive polling interval (`useGameView`'s 15s safety net still
 * covers it otherwise, e.g. if this tab is fully closed).
 */
export function useStillThereTimer(view: GameView | null, refetch: () => Promise<void>): StillThereState {
  const isMyTurn = Boolean(
    view && view.status === "playing" && view.mySeat !== null && view.view?.turn === view.mySeat,
  );
  const turnStartedAt = view?.turnStartedAt ?? null;
  const stillThereTimeoutSec = view?.settings.stillThereTimeoutSec ?? DEFAULT_STILL_THERE_TIMEOUT_SEC;
  const missedTurnsInRow = view?.myMissedTurnsInRow ?? 0;
  const gameId = view?.gameId ?? null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isMyTurn || turnStartedAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    const { deadlineAt } = idleWindow(turnStartedAt, missedTurnsInRow, stillThereTimeoutSec);
    const refetchDelay = Math.max(0, deadlineAt - Date.now()) + REFETCH_BUFFER_MS;
    const refetchTimer = setTimeout(() => void refetch(), refetchDelay);
    return () => {
      clearInterval(tick);
      clearTimeout(refetchTimer);
    };
  }, [isMyTurn, turnStartedAt, missedTurnsInRow, stillThereTimeoutSec, refetch]);

  const show = isMyTurn && turnStartedAt !== null && now >= idleWindow(turnStartedAt, missedTurnsInRow, stillThereTimeoutSec).showAt;

  // A tap anywhere on screen while the banner shows proves presence: tell the
  // server (so the miss streak and silence clock reset) and refetch so this
  // hook sees the fresh `turnStartedAt`/`myMissedTurnsInRow` and hides the
  // banner. Deliberately not `preventDefault`/`stopPropagation`-ing so a tap
  // that also lands on a card still plays it normally.
  useEffect(() => {
    if (!show || !gameId) return;
    const dismiss = () => {
      void markStillHere(gameId).finally(() => void refetch());
    };
    document.addEventListener("pointerdown", dismiss, { once: true });
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [show, gameId, refetch]);

  if (!isMyTurn || turnStartedAt === null) return { show: false, secondsLeft: 0 };
  const { deadlineAt } = idleWindow(turnStartedAt, missedTurnsInRow, stillThereTimeoutSec);
  return { show, secondsLeft: Math.max(0, Math.ceil((deadlineAt - now) / 1000)) };
}
