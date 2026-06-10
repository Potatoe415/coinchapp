"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  beginNextDeal,
  chooseBid,
  chooseCard,
  createInitialState,
  redact,
  startNextDeal,
  submitBid,
  submitPlay,
  type Card,
  type GameState,
  type ScoringRules,
  type Seat,
} from "@/lib/coinche";
import type { GameActions } from "@/components/GameTable";
import type { GameView } from "@/lib/server/view";

const BOTS = [false, true, true, true];
const NAMES = ["Vous", "Adam", "Jane", "Lea"];
/** Must match the CSS trick-collect animation duration. */
const COLLECT_DELAY_MS = 1500;
/** Simulated thinking time before each bot move. Configurable. */
export const BOT_THINKING_MS = 700;

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function startState(targetPoints: number, seed: number, scoringRules: ScoringRules): GameState {
  return beginNextDeal(createInitialState(targetPoints, scoringRules), seededRng(seed));
}

/** Fully offline single-player game: you are seat 0, the rest are bots.
 *  Runs the pure rules engine in the browser, no network. */
export function useLocalGame(
  targetPoints: number,
  seed: number,
  scoringRules: ScoringRules,
): { gv: GameView; actions: GameActions } {
  const stateRef = useRef<GameState | null>(null);
  if (!stateRef.current) {
    stateRef.current = startState(targetPoints, seed, scoringRules);
  }
  const [, setTick] = useState(0);
  const busyRef = useRef(false);
  const tick = useCallback(() => setTick((n) => n + 1), []);

  /** Advance bot seats one move at a time, waiting before each move to show the thinking indicator. */
  const runBots = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      let guard = 0;
      while (guard++ < 64) {
        const s = stateRef.current!;
        if ((s.phase !== "bidding" && s.phase !== "playing") || !BOTS[s.turn]) break;
        await wait(BOT_THINKING_MS);
        const prev = s;
        const next =
          s.phase === "bidding"
            ? submitBid(s, chooseBid(s))
            : submitPlay(s, s.turn as Seat, chooseCard(s));
        stateRef.current = next;
        tick();
        if (next.tricks.length > prev.tricks.length) {
          await wait(COLLECT_DELAY_MS);
        }
      }
    } finally {
      busyRef.current = false;
    }
  }, [tick]);

  /** Trigger bots on mount to handle any initial bot turns (e.g. bot bids first after the dealer). */
  useEffect(() => {
    runBots();
  }, [runBots]);

  const actions: GameActions = {
    onBid: async (payload) => {
      stateRef.current = submitBid(stateRef.current!, { seat: 0, ...payload });
      tick();
      await runBots();
    },
    onPlay: async (card: Card) => {
      const prev = stateRef.current!;
      const next = submitPlay(prev, 0, card);
      stateRef.current = next;
      tick();
      if (next.tricks.length > prev.tricks.length) {
        await wait(COLLECT_DELAY_MS);
      }
      await runBots();
    },
    onNextDeal: async () => {
      stateRef.current = startNextDeal(stateRef.current!);
      tick();
      await runBots();
    },
  };

  const state = stateRef.current!;
  const gv: GameView = {
    gameId: "local",
    roomCode: "LOCAL",
    status: state.phase === "finished" ? "finished" : "playing",
    settings: { targetPoints },
    version: 0,
    players: NAMES.map((name, seat) => ({
      seat,
      displayName: name,
      isBot: seat !== 0,
      team: seat % 2 === 0 ? "A" : "B",
      connected: true,
    })),
    mySeat: 0,
    view: redact(state, 0),
    hostUserId: null,
    hostSeat: 0,
    isHost: true,
  };

  return { gv, actions };
}
