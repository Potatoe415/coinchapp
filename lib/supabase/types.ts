import type { BotPunch, GameState as CoincheGameState } from "@/lib/coinche";
import type { GameState as BouillaGameState } from "@/lib/bouilla";

/** Coinche settings are all optional here: Bouilla games carry an empty `{}` since its
 *  6 rounds/point values are fixed (see docs/DECISIONS.md), no per-game configuration. */
export interface GameSettings {
  targetPoints?: number;
  countContractOnlyIfMade?: boolean;
  failedContractDefensePoints?: number;
  zeroPointsForNonContractingTeamWhenContractMade?: boolean;
  capotMadePoints?: number;
  capotFailedDefensePoints?: number;
  allowToutAtoutSansAtout?: boolean;
  requireMorePointsToWin?: boolean;
  /** Bot bidding aggressiveness. Defaults to "med" when absent. */
  botPunch?: BotPunch;
}

export type GameStatus = "lobby" | "playing" | "finished";

/** Which game a row belongs to. Extend the union when a new game is added. */
export type GameType = "coinche" | "bouilla";

export type AnyGameState = CoincheGameState | BouillaGameState;

export interface GameRow {
  id: string;
  room_code: string;
  /** Discriminator so one Supabase project can host several games. */
  game_type: GameType;
  status: GameStatus;
  settings: GameSettings;
  state: AnyGameState | null;
  version: number;
  /** User id of the client that runs the bots. Null until set on create. */
  host_user_id: string | null;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  game_id: string;
  seat: number;
  user_id: string | null;
  display_name: string;
  is_bot: boolean;
  team: "A" | "B";
  /** Presence heartbeat, refreshed on every getView call from this seat's client. */
  last_seen_at: string;
  created_at: string;
}
