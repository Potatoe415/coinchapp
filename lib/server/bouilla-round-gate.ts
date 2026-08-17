import { markReadyForNextRound, ROUND_AUTO_ADVANCE_MS, type GameState as BouillaGameState, type Seat } from "@/lib/bouilla";
import type { GameRow } from "@/lib/supabase/types";
import { applyStartNext, statusFor } from "./game-dispatch";
import { persistGame, type LoadedGame } from "./repo";

/** Online Bouilla only: end-of-round readiness gate ("every real player
 *  pressed Partie suivante, or 6s elapsed") - the ad-hoc equivalent lives in
 *  `lib/client/useP2PBouillaHost.ts` (in-memory, no DB involved there). */

function humanSeats(loaded: LoadedGame): number[] {
  return loaded.players.filter((p) => !p.is_bot).map((p) => p.seat);
}

/** Pure decision: has every human seat signaled ready? */
function everyHumanReady(humans: number[], readySeats: Seat[]): boolean {
  const readySet = new Set<number>(readySeats);
  return humans.length > 0 && humans.every((s) => readySet.has(s));
}

/** Mark `seat` ready for the next round; once every human seat has, the round
 *  actually advances (which also clears `readySeats`, see `startNextRound`). */
export function applyReadyForNextRound(loaded: LoadedGame, state: BouillaGameState, seat: Seat): BouillaGameState {
  if (state.phase !== "scoring") return state;
  const withReady = markReadyForNextRound(state, seat);
  if (everyHumanReady(humanSeats(loaded), withReady.readySeats ?? [])) {
    return applyStartNext("bouilla", withReady) as BouillaGameState;
  }
  return withReady;
}

/** Force the round forward once the scoring phase has been showing for too
 *  long, even if some human never pressed "Partie suivante". Runs
 *  opportunistically on every `getView` call, like the idle-turn timer
 *  (`lib/server/idle-timer.ts`) - same version-conflict handling. */
export async function advanceScoringTimeout(loaded: LoadedGame): Promise<void> {
  const { game } = loaded;
  if (game.game_type !== "bouilla" || !game.state) return;
  const state = game.state as BouillaGameState;
  if (state.phase !== "scoring") return;
  const elapsedMs = Date.now() - new Date(game.turn_started_at).getTime();
  if (elapsedMs < ROUND_AUTO_ADVANCE_MS) return;

  const next = applyStartNext("bouilla", state);
  try {
    const status = statusFor(next);
    const version = await persistGame(game as GameRow, next, status);
    game.state = next;
    game.status = status;
    game.version = version;
  } catch {
    // version_conflict: someone else (another poll, or the last human clicking
    // "Partie suivante") already advanced it.
  }
}
