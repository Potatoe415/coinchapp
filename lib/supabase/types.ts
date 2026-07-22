import type { BotPunch, GameState as CoincheGameState } from "@/lib/coinche";
import type { GameState as BouillaGameState } from "@/lib/bouilla";

/** Coinche settings are all optional here: Bouilla's 6 rounds/point values are fixed
 *  (see docs/DECISIONS.md), so it only ever carries `stillThereTimeoutSec` below. */
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
  /** Seconds of silence on a human's turn before the "are you still there?" idle
   *  timer kicks in (see lib/server/idle-timer.ts). Defaults to 15 when absent.
   *  Applies to both games. */
  stillThereTimeoutSec?: number;
  /** How long a bot "thinks" before playing, in ms (see BOT_THINK_MS_*
   *  constants below). Coinche: the ISMCTS play search's wall-clock budget
   *  (lib/client/bot.ts) - higher means a stronger search, not just a longer
   *  wait. Bouilla: its heuristic bot is instant, so this is a pure pacing
   *  delay (lib/client/cardGameDriver.ts `runBotLoop`'s `thinkingMs`). Applies
   *  to both games, and to every mode (online/local/ad-hoc). Defaults to
   *  `DEFAULT_BOT_THINK_MS` when absent. */
  botThinkMs?: number;
}

/** `GameSettings.botThinkMs` bounds and default - shared by the setup slider
 *  (`GameSettingsPanel.tsx`) and the server-side sanitizer (`lib/server/actions-lobby.ts`). */
export const DEFAULT_BOT_THINK_MS = 800;
export const MIN_BOT_THINK_MS = 800;
export const MAX_BOT_THINK_MS = 4000;
export const BOT_THINK_MS_STEP = 200;

/** Default for `GameSettings.stillThereTimeoutSec` when absent (older rows, or
 *  Bouilla before this setting existed). */
export const DEFAULT_STILL_THERE_TIMEOUT_SEC = 15;

/** The only selectable values for `stillThereTimeoutSec`, in order - the setup
 *  slider (`GameSettingsPanel.tsx`) and the server-side sanitizer
 *  (`lib/server/actions-lobby.ts`) both index into this same list. */
export const STILL_THERE_TIMEOUT_OPTIONS = [10, 15, 20, 30, 60] as const;

/** Fixed length of the visible "are you still there?" countdown, in ms. Only the
 *  total timeout above is configurable; this trailing slice is always 5s. */
export const STILL_THERE_POPUP_LEAD_MS = 5000;

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
  /** When state.turn last changed; anchors the idle-turn timer. */
  turn_started_at: string;
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
  /** Consecutive missed turns (idle-turn timer); reset on any successful self-play. */
  missed_turns_in_row: number;
  created_at: string;
}
