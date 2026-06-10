import type { BotPunch, GameState } from "@/lib/coinche";

export interface GameSettings {
  targetPoints: number;
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

export interface GameRow {
  id: string;
  room_code: string;
  status: GameStatus;
  settings: GameSettings;
  state: GameState | null;
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
  connected: boolean;
  created_at: string;
}
