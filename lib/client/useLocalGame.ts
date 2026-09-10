"use client";

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
import { seededRng, wait } from "./cardGameDriver";
import { coincheEngine } from "./coincheEngineAdapter";
import { LOCAL_COINCHE_STORAGE_KEY } from "./localGamePersistence";
import { useBotWorker } from "./useBotWorker";
import { useLocalCardGame } from "./useLocalCardGame";

const BOTS = [false, true, true, true];
const NAMES = ["Vous", "Adam", "Jane", "Lea"];
/** Must match the CSS trick-collect animation duration. */
const COLLECT_DELAY_MS = 1500;

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
  botThinkMs: number,
): { gv: GameView; actions: GameActions } {
  const decide = useBotWorker(botPunch, botThinkMs);
  // The ISMCTS search (via `decide`) runs in a Web Worker and overlaps the
  // minimum thinking delay, so the UI never blocks.
  const { state, stateRef, commit, runBots } = useLocalCardGame({
    initialState: () => startState(targetPoints, seed, scoringRules),
    storageKey: LOCAL_COINCHE_STORAGE_KEY,
    engine: coincheEngine,
    decide,
    isBot: (seat) => BOTS[seat],
    thinkingMs: botThinkMs,
    collectDelayMs: COLLECT_DELAY_MS,
  });

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
    // Local play never runs the server-side idle-turn timer (no Server Actions
    // involved at all): these are inert placeholders.
    turnStartedAt: null,
    myMissedTurnsInRow: 0,
  };

  return { gv, actions };
}
