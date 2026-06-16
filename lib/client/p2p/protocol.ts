"use client";

import { redact, type BidType, type Card, type GameState, type Seat, type TrumpMode } from "@/lib/coinche";
import type { GameSettings } from "@/lib/supabase/types";
import type { GameView } from "@/lib/server/view";

/** One seat at the table, as agreed in the lobby before the game starts. */
export interface RosterEntry {
  seat: Seat;
  displayName: string;
  isBot: boolean;
}

/** Messages a client sends to the host (its own seat's moves). */
export type ClientMessage =
  | { t: "hello"; name: string }
  | { t: "bid"; payload: { type: BidType; value?: number; suit?: TrumpMode } }
  | { t: "play"; card: Card }
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

/** Build the redacted GameView a single seat is allowed to see. */
export function buildSeatView(
  state: GameState,
  seat: Seat,
  roster: RosterEntry[],
  settings: GameSettings,
  hostSeat: Seat,
): GameView {
  return {
    gameId: "adhoc",
    roomCode: "P2P",
    status: state.phase === "finished" ? "finished" : "playing",
    settings,
    version: 0,
    players: roster.map((entry) => ({
      seat: entry.seat,
      displayName: entry.displayName,
      isBot: entry.isBot,
      team: entry.seat % 2 === 0 ? "A" : "B",
      connected: true,
    })),
    mySeat: seat,
    view: redact(state, seat),
    hostUserId: null,
    hostSeat,
    isHost: seat === hostSeat,
  };
}
