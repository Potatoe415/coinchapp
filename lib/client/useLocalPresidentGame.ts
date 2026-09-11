"use client";

import {
  beginNextRound,
  createInitialState,
  redact,
  startNextRound,
  submitExchangeReturn,
  submitPass,
  submitPlay,
  type Card,
  type Combo,
  type GameState,
} from "@/lib/president";
import type { PresidentActions } from "@/components/PresidentTable";
import type { GameView } from "@/lib/server/view";
import { useI18n } from "./i18n";
import { seededRng } from "./cardGameDriver";
import { decidePresidentAction, presidentEngine } from "./presidentEngineAdapter";
import { LOCAL_PRESIDENT_STORAGE_KEY } from "./localGamePersistence";
import { useLocalCardGame } from "./useLocalCardGame";

const BOTS = [false, true, true, true];
const BOT_NAMES = ["", "Adam", "Jane", "Lea"];
/** Matches the shared `.trick-collect-card` CSS animation duration
 *  (`app/globals.css`), reused for the pile-burn sweep in `PresidentTable.tsx`
 *  - also doubles as a plain pacing beat once a seat empties its hand. */
const COLLECT_DELAY_MS = 1500;

function startState(seed: number, roundsToPlay: number): GameState {
  return beginNextRound(createInitialState(roundsToPlay), seededRng(seed));
}

/** Fully offline single-player Président game: you are seat 0, the rest are
 *  bots. Runs the pure rules engine in the browser, no network. `botThinkMs`
 *  paces each bot move - the heuristic bot has no search to overlap, so this
 *  delay alone drives the "reflexion" feel (see GameSettings.botThinkMs). */
export function useLocalPresidentGame(
  seed: number,
  botThinkMs: number,
  roundsToPlay: number,
): { gv: GameView; actions: PresidentActions } {
  const { t } = useI18n();
  const { state, stateRef, commit, runBots } = useLocalCardGame({
    initialState: () => startState(seed, roundsToPlay),
    storageKey: LOCAL_PRESIDENT_STORAGE_KEY,
    engine: presidentEngine,
    decide: decidePresidentAction,
    isBot: (seat) => BOTS[seat],
    thinkingMs: botThinkMs,
    collectDelayMs: COLLECT_DELAY_MS,
  });

  const actions: PresidentActions = {
    onPlay: async (combo: Combo) => {
      commit(submitPlay(stateRef.current, 0, combo));
      await runBots();
    },
    onPass: async () => {
      commit(submitPass(stateRef.current, 0));
      await runBots();
    },
    onExchangeReturn: async (cards: Card[]) => {
      commit(submitExchangeReturn(stateRef.current, 0, cards));
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
    gameType: "president",
    status: state.phase === "finished" ? "finished" : "playing",
    settings: { presidentRoundsToPlay: roundsToPlay },
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
