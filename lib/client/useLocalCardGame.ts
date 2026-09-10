"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runBotLoop, type BotLoopEngine } from "./cardGameDriver";
import { loadPersistedGame, savePersistedGame } from "./localGamePersistence";

export interface UseLocalCardGameConfig<TState, TView, TAction> {
  /** Builds the freshly-dealt starting state (called once, on first mount). */
  initialState: () => TState;
  storageKey: string;
  engine: BotLoopEngine<TState, TView, TAction>;
  decide: (view: TView, seat: number) => Promise<TAction>;
  isBot: (seat: number) => boolean;
  thinkingMs: number;
  /** Must match the CSS trick-collect animation duration. Defaults to 1500ms
   *  (Coinche/Bouilla's own tricks); Président passes its own, shorter value. */
  collectDelayMs?: number;
}

export interface UseLocalCardGameResult<TState> {
  state: TState;
  /** Mirror of `state` for the async bot loop and action handlers, kept in
   *  sync without waiting for a render. */
  stateRef: { current: TState };
  commit: (next: TState) => void;
  runBots: () => Promise<void>;
}

/** Shared scaffolding for every fully offline, single-player game: you are seat
 *  0, the rest are bots, and the pure rules engine runs entirely in the
 *  browser (state, localStorage persistence, the bot-advance loop). Each
 *  game's own hook (`useLocalGame`, `useLocalBouillaGame`,
 *  `useLocalPresidentGame`) wraps this for its own `actions` object and
 *  `GameView` shape, which stay irreducibly game-specific (see
 *  docs/DECISIONS.md). */
export function useLocalCardGame<TState extends { phase: string }, TView, TAction>(
  config: UseLocalCardGameConfig<TState, TView, TAction>,
): UseLocalCardGameResult<TState> {
  const { initialState, storageKey, engine, decide, isBot, thinkingMs, collectDelayMs = 1500 } = config;
  const [state, setState] = useState<TState>(initialState);
  const stateRef = useRef(state);
  const busyRef = useRef(false);

  const commit = useCallback(
    (next: TState) => {
      stateRef.current = next;
      setState(next);
      savePersistedGame(storageKey, next);
    },
    [storageKey],
  );

  const runBots = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await runBotLoop({ engine, getState: () => stateRef.current, isBot, decide, commit, thinkingMs, collectDelayMs });
    } finally {
      busyRef.current = false;
    }
  }, [engine, isBot, decide, commit, thinkingMs, collectDelayMs]);

  /** On mount, resume any saved in-progress match (reload/relaunch-proof
   *  offline play) before triggering bots' initial turns. Runs once: `storageKey`
   *  identifies which game this is and never changes for a mounted instance. */
  useEffect(() => {
    const saved = loadPersistedGame<TState>(storageKey);
    // Mount-only hydration from localStorage, not a reactive state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) commit(saved);
    runBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, stateRef, commit, runBots };
}
