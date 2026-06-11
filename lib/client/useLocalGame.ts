"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  beginNextDeal,
  createInitialState,
  redact,
  startNextDeal,
  submitBid,
  submitPlay,
  type BotPunch,
  type Card,
  type GameState,
  type ScoringRules,
  type Seat,
} from "@/lib/coinche";
import type { GameActions } from "@/components/GameTable";
import type { GameView } from "@/lib/server/view";
import type { BotAction } from "./bot";
import { useBotWorker } from "./useBotWorker";

const BOTS = [false, true, true, true];
const NAMES = ["Vous", "Adam", "Jane", "Lea"];
/** Must match the CSS trick-collect animation duration. */
const COLLECT_DELAY_MS = 1500;
/** Simulated thinking time before each bot move. Configurable. */
export const BOT_THINKING_MS = 500;

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

/** Apply a bot's decided action (heuristic bid or ISMCTS card) to the state. */
function applyBotAction(state: GameState, seat: Seat, action: BotAction): GameState {
  if (action.action === "PLAY") return submitPlay(state, seat, action.card);
  if (action.action === "BID") {
    return submitBid(state, { seat, type: "bid", value: action.value, suit: action.suit });
  }
  return submitBid(state, { seat, type: "pass" });
}

/** Fully offline single-player game: you are seat 0, the rest are bots.
 *  Runs the pure rules engine in the browser, no network. */
export function useLocalGame(
  targetPoints: number,
  seed: number,
  scoringRules: ScoringRules,
  botPunch: BotPunch,
): { gv: GameView; actions: GameActions } {
  const [state, setState] = useState<GameState>(() =>
    startState(targetPoints, seed, scoringRules),
  );
  // Mirror of `state` for the async bot loop, kept in sync without waiting for a render.
  const stateRef = useRef(state);
  const busyRef = useRef(false);
  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const decide = useBotWorker(botPunch);

  /** Advance bot seats one move at a time. The ISMCTS search runs in a Web
   *  Worker and overlaps the minimum thinking delay, so the UI never blocks. */
  const runBots = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      let guard = 0;
      while (guard++ < 64) {
        const prev = stateRef.current;
        if ((prev.phase !== "bidding" && prev.phase !== "playing") || !BOTS[prev.turn]) break;
        const seat = prev.turn as Seat;
        const [action] = await Promise.all([decide(redact(prev, seat)), wait(BOT_THINKING_MS)]);
        const next = applyBotAction(prev, seat, action);
        commit(next);
        if (next.tricks.length > prev.tricks.length) {
          await wait(COLLECT_DELAY_MS);
        }
      }
    } finally {
      busyRef.current = false;
    }
  }, [commit, decide]);

  /** Trigger bots on mount to handle any initial bot turns (e.g. bot bids first after the dealer). */
  useEffect(() => {
    runBots();
  }, [runBots]);

  const actions: GameActions = {
    onBid: async (payload) => {
      commit(submitBid(stateRef.current, { seat: 0, ...payload }));
      await runBots();
    },
    onPlay: async (card: Card) => {
      const prev = stateRef.current;
      const next = submitPlay(prev, 0, card);
      commit(next);
      if (next.tricks.length > prev.tricks.length) {
        await wait(COLLECT_DELAY_MS);
      }
      await runBots();
    },
    onNextDeal: async () => {
      commit(startNextDeal(stateRef.current));
      await runBots();
    },
    onReshuffle: async () => {
      commit(beginNextDeal(stateRef.current, Math.random));
      await runBots();
    },
  };

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
