"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beginNextRound, createInitialState, redact, startNextRound, submitPlay, type Card, type GameState } from "@/lib/bouilla";
import type { BouillaActions } from "@/components/BouillaTable";
import type { GameView } from "@/lib/server/view";
import { useI18n } from "./i18n";
import { runBotLoop, seededRng, wait } from "./cardGameDriver";
import { bouillaEngine, decideBouillaAction } from "./bouillaEngineAdapter";
import { LOCAL_BOUILLA_STORAGE_KEY, loadPersistedGame, savePersistedGame } from "./localGamePersistence";

const BOTS = [false, true, true, true];
const BOT_NAMES = ["", "Adam", "Jane", "Lea"];
/** Must match the CSS trick-collect animation duration. */
const COLLECT_DELAY_MS = 1500;

function startState(seed: number): GameState {
  return beginNextRound(createInitialState(), seededRng(seed));
}

/** Fully offline single-player Bouilla game: you are seat 0, the rest are bots.
 *  Runs the pure rules engine in the browser, no network. `botThinkMs` paces
 *  each bot move: the heuristic bot has no search to overlap, so this delay
 *  alone drives the "reflexion" feel (see GameSettings.botThinkMs). */
export function useLocalBouillaGame(seed: number, botThinkMs: number): { gv: GameView; actions: BouillaActions } {
  const { t } = useI18n();
  const [state, setState] = useState<GameState>(() => startState(seed));
  // Mirror of `state` for the async bot loop, kept in sync without waiting for a render.
  const stateRef = useRef(state);
  const busyRef = useRef(false);
  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
    savePersistedGame(LOCAL_BOUILLA_STORAGE_KEY, next);
  }, []);

  const runBots = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await runBotLoop({
        engine: bouillaEngine,
        getState: () => stateRef.current,
        isBot: (seat) => BOTS[seat],
        decide: decideBouillaAction,
        commit,
        thinkingMs: botThinkMs,
        collectDelayMs: COLLECT_DELAY_MS,
      });
    } finally {
      busyRef.current = false;
    }
  }, [commit, botThinkMs]);

  /** On mount, resume any saved in-progress match (reload/relaunch-proof
   *  offline play) before triggering bots' initial turns. */
  useEffect(() => {
    const saved = loadPersistedGame<GameState>(LOCAL_BOUILLA_STORAGE_KEY);
    // Mount-only hydration from localStorage, not a reactive state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) commit(saved);
    runBots();
  }, [commit, runBots]);

  const actions: BouillaActions = {
    onPlay: async (card: Card) => {
      const prev = stateRef.current;
      const next = submitPlay(prev, 0, card);
      commit(next);
      if (next.tricks.length > prev.tricks.length) {
        await wait(COLLECT_DELAY_MS);
      }
      await runBots();
    },
    onNextRound: async () => {
      commit(startNextRound(stateRef.current));
      await runBots();
    },
  };

  const gv: GameView = {
    gameId: "local",
    roomCode: "LOCAL",
    gameType: "bouilla",
    status: state.phase === "finished" ? "finished" : "playing",
    settings: {},
    version: 0,
    players: BOT_NAMES.map((name, seat) => ({
      seat,
      displayName: seat === 0 ? t("defaultYouName") : name,
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
