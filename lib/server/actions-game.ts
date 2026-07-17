"use server";

import type { BidType, Seat, TrumpMode } from "@/lib/coinche";
import { getServiceClient, getUserId } from "@/lib/supabase/server";
import type { AnyGameState, GameRow, GameType } from "@/lib/supabase/types";
import {
  applyCardPlay,
  applyMove,
  applyStartNext,
  chooseHeuristicMove,
  isActivePhase,
  statusFor,
  type BotMove,
  type WireCard,
} from "./game-dispatch";
import { advanceIdleTurns, markSeatPresent, resetMissedTurns } from "./idle-timer";
import { botSeats, isSeatLive, loadGame, persistGame, seatOf, touchGame, touchPresence, type LoadedGame } from "./repo";
import { buildView, type GameView } from "./view";

/** Above this silence, whoever is responsible for the current turn (a human,
 * or the host for a bot seat) is presumed gone for good, and the simple
 * heuristic bot plays their turn instead so the table never freezes forever.
 * This is a much coarser, browser-gone safety net than the idle-turn timer
 * (`lib/server/idle-timer.ts`), which reacts within seconds to a present-but-
 * unresponsive player instead of 45s of silence. */
const TAKEOVER_STALE_MS = 45_000;
const MAX_TAKEOVER_STEPS = 16;

async function loadForAction(gameId: string): Promise<{
  loaded: LoadedGame;
  seat: Seat;
  state: AnyGameState;
  gameType: GameType;
}> {
  // Neither call depends on the other's result: run them concurrently instead
  // of paying for both round trips back-to-back on every submitted move.
  const [uid, loaded] = await Promise.all([getUserId(), loadGame(gameId)]);
  if (!uid) throw new Error("not_authenticated");
  const seat = seatOf(uid, loaded.players);
  if (seat === null) throw new Error("not_a_member");
  if (!loaded.game.state) throw new Error("game_not_started");
  return { loaded, seat: seat as Seat, state: loaded.game.state, gameType: loaded.game.game_type };
}

async function commit(loaded: LoadedGame, state: AnyGameState): Promise<void> {
  await persistGame(loaded.game as GameRow, state, statusFor(state));
}

export async function placeBid(
  gameId: string,
  bid: { type: BidType; value?: number; suit?: TrumpMode },
): Promise<void> {
  const { loaded, seat, state, gameType } = await loadForAction(gameId);
  if (gameType === "bouilla") throw new Error("bidding_not_supported");
  const next = applyMove(gameType, state, seat, { bid: { seat, type: bid.type, value: bid.value, suit: bid.suit } });
  await commit(loaded, next);
  resetMissedTurns(loaded, seat);
}

export async function playCard(gameId: string, card: WireCard): Promise<void> {
  const { loaded, seat, state, gameType } = await loadForAction(gameId);
  const next = applyCardPlay(gameType, state, seat, card);
  await commit(loaded, next);
  resetMissedTurns(loaded, seat);
}

/** A tap anywhere on screen while the idle-turn "are you still there?" banner is
 *  showing (see `lib/client/useStillThereTimer.ts`) counts as proof of presence:
 *  clears the miss streak and restarts the silence clock, even though the seat
 *  has not actually played a card yet. A no-op if it is not currently this
 *  seat's turn. */
export async function markStillHere(gameId: string): Promise<void> {
  const { loaded, seat, state } = await loadForAction(gameId);
  if (state.turn !== seat) return;
  await markSeatPresent(loaded, seat);
}

export async function nextDeal(gameId: string): Promise<void> {
  const { loaded, state, gameType } = await loadForAction(gameId);
  await commit(loaded, applyStartNext(gameType, state));
}

/** Host-only: submit the move for the bot seat whose turn it currently is. */
export async function submitBotMove(gameId: string, seat: Seat, move: BotMove): Promise<void> {
  const [uid, loaded] = await Promise.all([getUserId(), loadGame(gameId)]);
  if (!uid) throw new Error("not_authenticated");
  if (loaded.game.host_user_id !== uid) throw new Error("not_host");
  const state = loaded.game.state;
  if (!state) throw new Error("game_not_started");
  if (state.turn !== seat) throw new Error("not_bot_turn");
  if (!botSeats(loaded.players)[seat]) throw new Error("seat_not_bot");

  const gameType = loaded.game.game_type;
  const next =
    move.kind === "play"
      ? applyCardPlay(gameType, state, seat, move.card)
      : applyMove(gameType, state, seat, { bid: { seat, type: move.type, value: move.value, suit: move.suit } });
  await commit(loaded, next);
}

/** Take over running the bots. The caller must be a seated human. */
export async function becomeHost(gameId: string): Promise<void> {
  const uid = await getUserId();
  if (!uid) throw new Error("not_authenticated");
  const loaded = await loadGame(gameId);
  if (seatOf(uid, loaded.players) === null) throw new Error("not_a_member");
  if (loaded.game.host_user_id === uid) return;
  const supabase = getServiceClient();
  const { error } = await supabase.from("games").update({ host_user_id: uid }).eq("id", gameId);
  if (error) throw new Error("persist_failed");
  await touchGame(loaded.game as GameRow);
}

/**
 * Safety net: auto-play any turn whose responsible party has gone silent for
 * `TAKEOVER_STALE_MS`, using the simple heuristic bot (not the strong client
 * ISMCTS brain, which needs a browser). Runs opportunistically on every
 * `getView` call so an absent host or player can never freeze the table
 * forever; concurrent callers are safe since `persistGame` requires the
 * version to still match (see repo.ts `updateVersioned`).
 */
async function advanceStaleTurns(loaded: LoadedGame): Promise<void> {
  const state = loaded.game.state;
  if (!state) return;
  const gameType = loaded.game.game_type;
  const now = Date.now();
  let current = state;
  for (let steps = 0; steps < MAX_TAKEOVER_STEPS; steps++) {
    if (!isActivePhase(gameType, current) || isSeatLive(loaded, current.turn, now, TAKEOVER_STALE_MS)) break;
    const seat = current.turn as Seat;
    current = applyMove(gameType, current, seat, chooseHeuristicMove(gameType, current, seat));
  }
  if (current === state) return;
  try {
    const status = statusFor(current);
    const version = await persistGame(loaded.game as GameRow, current, status);
    loaded.game.state = current;
    loaded.game.status = status;
    loaded.game.version = version;
  } catch {
    // Another caller already advanced it (version_conflict); the state we
    // just read is stale but buildView still returns a consistent view.
  }
}

export async function getView(gameId: string): Promise<GameView> {
  // Same reasoning as loadForAction: this runs on every card played and every
  // realtime tick, so the two independent round trips are worth overlapping.
  const [uid, loaded] = await Promise.all([getUserId(), loadGame(gameId)]);
  const mySeat = seatOf(uid, loaded.players);
  if (mySeat !== null) touchPresence(loaded, mySeat);
  // Tighter, seat-idle-specific check first (seconds, not the browser-gone 45s
  // safety net below); see lib/server/idle-timer.ts.
  await advanceIdleTurns(loaded);
  await advanceStaleTurns(loaded);
  return buildView(loaded, uid);
}
