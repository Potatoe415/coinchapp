import {
  markReadyForNextRound as markBouillaReady,
  ROUND_AUTO_ADVANCE_MS as BOUILLA_ROUND_AUTO_ADVANCE_MS,
  type GameState as BouillaGameState,
  type Seat,
} from "@/lib/bouilla";
import {
  markReadyForNextRound as markPresidentReady,
  ROUND_AUTO_ADVANCE_MS as PRESIDENT_ROUND_AUTO_ADVANCE_MS,
  type GameState as PresidentGameState,
} from "@/lib/president";
import type { AnyGameState, GameRow, GameType } from "@/lib/supabase/types";
import { applyStartNext, statusFor } from "./game-dispatch";
import { persistGame, type LoadedGame } from "./repo";

/** Online Bouilla + Président only: end-of-round readiness gate ("every real
 *  player pressed Manche suivante, or a few seconds elapsed") - the ad-hoc
 *  equivalent lives in each game's own `useP2P<Game>Host.ts` (in-memory, no DB
 *  involved there). Coinche has no such gate: its `nextDeal` advances
 *  unconditionally as soon as anyone presses it. */
const ROUND_GATE_GAME_TYPES: GameType[] = ["bouilla", "president"];

function supportsRoundGate(gameType: GameType): boolean {
  return ROUND_GATE_GAME_TYPES.includes(gameType);
}

function autoAdvanceMs(gameType: GameType): number {
  return gameType === "president" ? PRESIDENT_ROUND_AUTO_ADVANCE_MS : BOUILLA_ROUND_AUTO_ADVANCE_MS;
}

/** Both engines carry an identically-shaped optional `readySeats?: Seat[]`
 *  field (see docs/DATA_MODEL.md) - narrowed here since `AnyGameState` itself
 *  doesn't expose it as a common member. */
function markReady(gameType: GameType, state: AnyGameState, seat: Seat): AnyGameState {
  return gameType === "president"
    ? markPresidentReady(state as PresidentGameState, seat)
    : markBouillaReady(state as BouillaGameState, seat);
}

function humanSeats(loaded: LoadedGame): number[] {
  return loaded.players.filter((p) => !p.is_bot).map((p) => p.seat);
}

/** Pure decision: has every human seat signaled ready? */
function everyHumanReady(humans: number[], readySeats: Seat[]): boolean {
  const readySet = new Set<number>(readySeats);
  return humans.length > 0 && humans.every((s) => readySet.has(s));
}

/** Mark `seat` ready for the next round; once every human seat has, the round
 *  actually advances (which also clears `readySeats`, see each engine's own
 *  `startNextRound`). */
export function applyReadyForNextRound(loaded: LoadedGame, gameType: GameType, state: AnyGameState, seat: Seat): AnyGameState {
  if (state.phase !== "scoring") return state;
  const withReady = markReady(gameType, state, seat);
  const readySeats = (withReady as { readySeats?: Seat[] }).readySeats ?? [];
  if (everyHumanReady(humanSeats(loaded), readySeats)) {
    return applyStartNext(gameType, withReady);
  }
  return withReady;
}

/** Force the round forward once the scoring phase has been showing for too
 *  long, even if some human never pressed "Manche suivante". Runs
 *  opportunistically on every `getView` call, like the idle-turn timer
 *  (`lib/server/idle-timer.ts`) - same version-conflict handling. */
export async function advanceScoringTimeout(loaded: LoadedGame): Promise<void> {
  const { game } = loaded;
  if (!supportsRoundGate(game.game_type) || !game.state) return;
  const state = game.state;
  if (state.phase !== "scoring") return;
  const elapsedMs = Date.now() - new Date(game.turn_started_at).getTime();
  if (elapsedMs < autoAdvanceMs(game.game_type)) return;

  const next = applyStartNext(game.game_type, state);
  try {
    const status = statusFor(next);
    const version = await persistGame(game as GameRow, next, status);
    game.state = next;
    game.status = status;
    game.version = version;
  } catch {
    // version_conflict: someone else (another poll, or the last human clicking
    // "Manche suivante") already advanced it.
  }
}
