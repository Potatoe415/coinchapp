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
} from "@/lib/coinche";
import type { GameActions } from "@/components/GameTable";
import type { GameView } from "@/lib/server/view";
import { runBotLoop, seededRng, wait } from "./cardGameDriver";
import { coincheEngine } from "./coincheEngineAdapter";
import { useBotWorker } from "./useBotWorker";

const BOTS = [false, true, true, true];
const NAMES = ["Vous", "Adam", "Jane", "Lea"];
/** Must match the CSS trick-collect animation duration. */
const COLLECT_DELAY_MS = 1500;
/** Simulated thinking time before each bot move. Configurable. */
export const BOT_THINKING_MS = 500;

function startState(targetPoints: number, seed: number, scoringRules: ScoringRules): GameState {
  return beginNextDeal(createInitialState(targetPoints, scoringRules), seededRng(seed));
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
      await runBotLoop({
        engine: coincheEngine,
        getState: () => stateRef.current,
        isBot: (seat) => BOTS[seat],
        decide,
        commit,
        thinkingMs: BOT_THINKING_MS,
        collectDelayMs: COLLECT_DELAY_MS,
      });
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
    gameType: "coinche",
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
