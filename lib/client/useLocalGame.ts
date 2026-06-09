"use client";

import { useCallback, useState } from "react";
import {
  advanceBots,
  beginNextDeal,
  createInitialState,
  redact,
  startNextDeal,
  submitBid,
  submitPlay,
  type Card,
  type Difficulty,
  type GameState,
} from "@/lib/coinche";
import type { GameActions } from "@/components/GameTable";
import type { GameView } from "@/lib/server/view";

const BOTS = [false, true, true, true];
const NAMES = ["Vous", "Adam", "Jane", "Lea"];

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

function startState(targetPoints: number, difficulty: Difficulty, seed: number): GameState {
  const rng = seededRng(seed);
  return advanceBots(beginNextDeal(createInitialState(targetPoints), rng), BOTS, difficulty, rng);
}

/** Fully offline single-player game: you are seat 0, the rest are bots.
 *  Runs the pure rules engine in the browser, no network. */
export function useLocalGame(
  targetPoints: number,
  difficulty: Difficulty,
  seed: number,
): { gv: GameView; actions: GameActions } {
  const [state, setState] = useState<GameState>(() => startState(targetPoints, difficulty, seed));

  const apply = useCallback(
    (producer: (s: GameState) => GameState) => {
      setState((s) => advanceBots(producer(s), BOTS, difficulty));
    },
    [difficulty],
  );

  const actions: GameActions = {
    onBid: (payload) => apply((s) => submitBid(s, { seat: 0, ...payload })),
    onPlay: (card: Card) => apply((s) => submitPlay(s, 0, card)),
    onNextDeal: () => apply((s) => startNextDeal(s)),
  };

  const gv: GameView = {
    gameId: "local",
    roomCode: "LOCAL",
    status: state.phase === "finished" ? "finished" : "playing",
    settings: { targetPoints, botDifficulty: difficulty },
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
  };

  return { gv, actions };
}
