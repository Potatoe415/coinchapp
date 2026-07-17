"use client";

import { redact as redactCoinche, type BidType, type GameState as CoincheGameState, type Seat, type TrumpMode } from "@/lib/coinche";
import { redact as redactBouilla, type GameState as BouillaGameState } from "@/lib/bouilla";
import type { GameSettings, GameType } from "@/lib/supabase/types";
import type { GameView } from "@/lib/server/view";

/** One seat at the table, as agreed in the lobby before the game starts. */
export interface RosterEntry {
  seat: Seat;
  displayName: string;
  isBot: boolean;
}

/** A played card, loosely typed at the transport boundary: the active game's own
 *  engine (`applyPlay`/`isLegalPlay`) is what actually validates rank/suit/legality. */
export type WireCard = { suit: string; rank: string };

/** Messages a client sends to the host (its own seat's moves). Bidding never applies
 *  to Bouilla (no auction); the host simply never expects a "bid" message for it. */
export type ClientMessage =
  | { t: "hello"; name: string }
  | { t: "bid"; payload: { type: BidType; value?: number; suit?: TrumpMode } }
  | { t: "play"; card: WireCard }
  | { t: "nextDeal" };

/** Messages the host sends to a client (that seat's redacted view). */
export type HostMessage = { t: "view"; view: GameView };

export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    return JSON.parse(raw) as ClientMessage;
  } catch {
    return null;
  }
}

export function parseHostMessage(raw: string): HostMessage | null {
  try {
    return JSON.parse(raw) as HostMessage;
  } catch {
    return null;
  }
}

function lobbyPlayers(roster: RosterEntry[]) {
  return roster.map((entry) => ({
    seat: entry.seat,
    displayName: entry.displayName,
    isBot: entry.isBot,
    team: (entry.seat % 2 === 0 ? "A" : "B") as "A" | "B",
    connected: true,
  }));
}

/** Build the redacted GameView a single seat is allowed to see, for a Coinche table. */
export function buildSeatView(
  state: CoincheGameState,
  seat: Seat,
  roster: RosterEntry[],
  settings: GameSettings,
  hostSeat: Seat,
): GameView {
  return {
    gameId: "adhoc",
    roomCode: "P2P",
    gameType: "coinche" as GameType,
    status: state.phase === "finished" ? "finished" : "playing",
    settings,
    version: 0,
    players: lobbyPlayers(roster),
    mySeat: seat,
    view: redactCoinche(state, seat),
    hostUserId: null,
    hostSeat,
    isHost: seat === hostSeat,
    // Ad-hoc (P2P) never runs the server-side idle-turn timer: there is no
    // Server Action loop to enforce it, so these are inert placeholders.
    turnStartedAt: null,
    myMissedTurnsInRow: 0,
  };
}

/** Same as `buildSeatView`, for a Bouilla table (no bidding/trump/teams to carry). */
export function buildBouillaSeatView(
  state: BouillaGameState,
  seat: Seat,
  roster: RosterEntry[],
  settings: GameSettings,
  hostSeat: Seat,
): GameView {
  return {
    gameId: "adhoc",
    roomCode: "P2P",
    gameType: "bouilla" as GameType,
    status: state.phase === "finished" ? "finished" : "playing",
    settings,
    version: 0,
    players: lobbyPlayers(roster),
    mySeat: seat,
    view: redactBouilla(state, seat),
    hostUserId: null,
    hostSeat,
    isHost: seat === hostSeat,
    turnStartedAt: null,
    myMissedTurnsInRow: 0,
  };
}
