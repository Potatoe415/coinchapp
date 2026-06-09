import type { Difficulty } from "@/lib/coinche";
import type { GameState } from "@/lib/coinche";

export interface GameSettings {
  targetPoints: number;
  botDifficulty: Difficulty;
}

export type GameStatus = "lobby" | "playing" | "finished";

export interface GameRow {
  id: string;
  room_code: string;
  status: GameStatus;
  settings: GameSettings;
  state: GameState | null;
  version: number;
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
