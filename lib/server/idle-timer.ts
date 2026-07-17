import { after } from "next/server";
import { legalCards as legalCoincheCards, type Seat } from "@/lib/coinche";
import type { GameState as CoincheGameState } from "@/lib/coinche";
import { legalCards as legalBouillaCards } from "@/lib/bouilla";
import type { GameState as BouillaGameState } from "@/lib/bouilla";
import { getServiceClient } from "@/lib/supabase/server";
import {
  DEFAULT_STILL_THERE_TIMEOUT_SEC,
  STILL_THERE_POPUP_LEAD_MS,
  type AnyGameState,
  type GameRow,
  type GameType,
  type PlayerRow,
} from "@/lib/supabase/types";
import {
  applyMove,
  chooseHeuristicMove,
  isActivePhase,
  statusFor,
  type HeuristicMove,
} from "./game-dispatch";
import { persistGame, type LoadedGame } from "./repo";

export type IdleAction = "none" | "autoPlay" | "convertToBot";

/**
 * Pure decision for the "are you still there?" idle-turn timer: given how long
 * the current turn has been silent, how many turns in a row this seat has
 * already missed, and the game's configured timeout, decide what (if
 * anything) should happen right now. Kept pure and unit-tested (see
 * `idle-timer.test.ts`) - the DB side effects live below.
 *
 * - 0 misses so far: silent for `stillThereTimeoutSec`, then auto-play.
 * - 1+ misses in a row: the popup shows immediately (no invisible wait), and
 *   missing this shorter, popup-only window converts the seat to a bot.
 */
export function decideIdleAction(params: {
  elapsedMs: number;
  missedTurnsInRow: number;
  stillThereTimeoutSec: number;
}): IdleAction {
  const timeoutMs =
    params.missedTurnsInRow >= 1
      ? STILL_THERE_POPUP_LEAD_MS
      : Math.max(STILL_THERE_POPUP_LEAD_MS, params.stillThereTimeoutSec * 1000);
  if (params.elapsedMs < timeoutMs) return "none";
  return params.missedTurnsInRow >= 1 ? "convertToBot" : "autoPlay";
}

/** A uniformly random legal card for `seat` (first-offense auto-play only; once a
 *  seat is a permanent bot, every future move goes through the heuristic bot
 *  like any other bot seat instead). */
function chooseRandomCard(gameType: GameType, state: AnyGameState, seat: Seat) {
  const legal =
    gameType === "bouilla"
      ? legalBouillaCards(state as BouillaGameState, seat)
      : legalCoincheCards(state as CoincheGameState, seat);
  if (legal.length === 0) throw new Error("no_legal_cards");
  return legal[Math.floor(Math.random() * legal.length)];
}

/** Coinche bidding has no sensible "random" move (an unlucky random bid could
 *  hand out a huge, unwanted contract); idle bidding timeouts always use the
 *  same heuristic bid the 45s browser-gone safety net already relies on. */
function isBiddingPhase(gameType: GameType, state: AnyGameState): boolean {
  return gameType === "coinche" && state.phase === "bidding";
}

/** The move to apply for a given idle action: a genuine random card for a first
 *  offense (except bidding, see `isBiddingPhase`), or the heuristic bot's own
 *  move once the seat is being converted to a permanent bot. */
function chooseIdleMove(gameType: GameType, state: AnyGameState, seat: Seat, action: IdleAction): HeuristicMove {
  if (action === "convertToBot" || isBiddingPhase(gameType, state)) return chooseHeuristicMove(gameType, state, seat);
  return { card: chooseRandomCard(gameType, state, seat) };
}

/** DB side effects for a seat that just got auto-played or converted to a bot.
 *  Updates `loaded.players` in place too, so a subsequent read in the same
 *  request (or the next `advanceIdleTurns` call) sees the fresh value. */
async function applySeatEffect(gameId: string, player: PlayerRow, action: IdleAction): Promise<void> {
  const supabase = getServiceClient();
  if (action === "convertToBot") {
    await supabase
      .from("game_players")
      .update({ is_bot: true, user_id: null, missed_turns_in_row: 0 })
      .eq("game_id", gameId)
      .eq("seat", player.seat);
    player.is_bot = true;
    player.user_id = null;
    player.missed_turns_in_row = 0;
  } else {
    const missedTurnsInRow = player.missed_turns_in_row + 1;
    await supabase
      .from("game_players")
      .update({ missed_turns_in_row: missedTurnsInRow })
      .eq("game_id", gameId)
      .eq("seat", player.seat);
    player.missed_turns_in_row = missedTurnsInRow;
  }
}

/** Persist the auto-played/converted state, matching `advanceStaleTurns`'s own
 *  version-conflict handling: if someone else already advanced the game, the
 *  seat-level side effect above still stands - it reflects a real fact about
 *  that seat regardless of who won the race. */
async function persistIdleAction(loaded: LoadedGame, next: AnyGameState): Promise<void> {
  try {
    const status = statusFor(next);
    const version = await persistGame(loaded.game as GameRow, next, status);
    loaded.game.state = next;
    loaded.game.status = status;
    loaded.game.version = version;
  } catch {
    // version_conflict: the state we read is stale, but buildView still returns
    // a consistent view, and the seat-level effect above already landed.
  }
}

/**
 * Idle-turn timer: unlike `advanceStaleTurns`'s 45s browser-gone safety net,
 * this reacts within seconds to a player who is present (their tab is open,
 * heartbeating) but not acting on their own turn. Runs on every `getView`
 * call, right before `advanceStaleTurns`.
 *
 * Only ever looks at the single current turn: after any action here the turn
 * moves to a different seat whose own clock (`turn_started_at`, stamped by
 * `persistGame`) starts fresh at "now", so it can never itself be already
 * overdue - one check per call is enough, no loop needed.
 */
export async function advanceIdleTurns(loaded: LoadedGame): Promise<void> {
  const state = loaded.game.state;
  if (!state) return;
  const gameType = loaded.game.game_type;
  if (!isActivePhase(gameType, state)) return;

  const seat = state.turn as Seat;
  const player = loaded.players.find((p) => p.seat === seat);
  if (!player || player.is_bot) return;

  const elapsedMs = Date.now() - new Date(loaded.game.turn_started_at).getTime();
  const stillThereTimeoutSec = loaded.game.settings.stillThereTimeoutSec ?? DEFAULT_STILL_THERE_TIMEOUT_SEC;
  const action = decideIdleAction({ elapsedMs, missedTurnsInRow: player.missed_turns_in_row, stillThereTimeoutSec });
  if (action === "none") return;

  const next = applyMove(gameType, state, seat, chooseIdleMove(gameType, state, seat, action));
  await applySeatEffect(loaded.game.id, player, action);
  await persistIdleAction(loaded, next);
}

/** Any successful self-play proves the seat is still present: clear its streak.
 *  Not on the critical path (nothing in the response depends on it), so the
 *  write is deferred via `after()` like `touchPresence`'s heartbeat. */
export function resetMissedTurns(loaded: LoadedGame, seat: number): void {
  const player = loaded.players.find((p) => p.seat === seat);
  if (!player || player.missed_turns_in_row === 0) return;
  player.missed_turns_in_row = 0;
  const gameId = loaded.game.id;
  after(() =>
    getServiceClient().from("game_players").update({ missed_turns_in_row: 0 }).eq("game_id", gameId).eq("seat", seat),
  );
}
