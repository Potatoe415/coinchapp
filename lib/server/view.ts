import { redact as redactCoinche, type PlayerView as CoinchePlayerView } from "@/lib/coinche";
import { redact as redactBouilla, type GameState as BouillaGameState, type PlayerView as BouillaPlayerView } from "@/lib/bouilla";
import type { GameRow, GameSettings, GameStatus, GameType } from "@/lib/supabase/types";
import { isSeatLive, PRESENCE_STALE_MS, seatOf, type LoadedGame } from "./repo";

export type AnyPlayerView = CoinchePlayerView | BouillaPlayerView;

export interface LobbyPlayer {
  seat: number;
  displayName: string;
  isBot: boolean;
  team: "A" | "B";
  connected: boolean;
}

/** Ad-hoc + online Bouilla: end-of-deal readiness gate (next deal/round waits
 *  for all humans, capped at `ROUND_AUTO_ADVANCE_MS` for online - see
 *  `lib/server/bouilla-round-gate.ts`). */
export interface NextDealGate {
  readyCount: number;
  humanCount: number;
  iAmReady: boolean;
}

export interface GameView {
  gameId: string;
  roomCode: string;
  gameType: GameType;
  status: GameStatus;
  settings: GameSettings;
  version: number;
  players: LobbyPlayer[];
  mySeat: number | null;
  view: AnyPlayerView | null;
  /** Epoch ms when the current turn started; anchors the client-side "are you
   *  still there?" countdown (lib/client/useStillThereTimer.ts). Null outside
   *  active play. */
  turnStartedAt: number | null;
  /** My own seat's consecutive missed-turn count (0 unless I've already missed
   *  a turn this game). Drives whether the countdown shows immediately. */
  myMissedTurnsInRow: number;
  /** User id of the client that runs the bots. */
  hostUserId: string | null;
  /** Seat of the host, or null if the host has no seat. */
  hostSeat: number | null;
  /** Whether the caller is the host (and thus the bot runner). */
  isHost: boolean;
  /** Redacted per-seat views for every bot seat. Present only for the host. */
  botViews?: Record<number, AnyPlayerView>;
  /** Ad-hoc/online Bouilla only: present during the scoring phase to gate the
   *  next round (see `NextDealGate`). Coinche and Bouilla's finished screen
   *  never set this. */
  nextDealGate?: NextDealGate;
}

/** Dispatch to the active game's own redact function (never shared: each game's
 *  hidden-information rules differ). */
function redactForSeat(game: GameRow, seat: 0 | 1 | 2 | 3): AnyPlayerView {
  if (game.game_type === "bouilla") return redactBouilla(game.state as Parameters<typeof redactBouilla>[0], seat);
  return redactCoinche(game.state as Parameters<typeof redactCoinche>[0], seat);
}

function buildBotViews(loaded: LoadedGame): Record<number, AnyPlayerView> {
  const { game, players } = loaded;
  const botViews: Record<number, AnyPlayerView> = {};
  if (!game.state) return botViews;
  for (const player of players) {
    if (player.is_bot) botViews[player.seat] = redactForSeat(game, player.seat as 0 | 1 | 2 | 3);
  }
  return botViews;
}

/** Online-only equivalent of the ad-hoc host's `attachGate` (`lib/client/p2p/hostEngine.ts`):
 *  Bouilla's own finished screen (rematch) is never gated, only its scoring phase. */
function bouillaNextDealGate(loaded: LoadedGame, mySeat: number | null): NextDealGate | undefined {
  const { game, players } = loaded;
  if (game.game_type !== "bouilla" || !game.state) return undefined;
  const state = game.state as BouillaGameState;
  if (state.phase !== "scoring") return undefined;
  const humans = players.filter((p) => !p.is_bot).map((p) => p.seat);
  const readySeats = new Set<number>(state.readySeats ?? []);
  return {
    readyCount: humans.filter((s) => readySeats.has(s)).length,
    humanCount: humans.length,
    iAmReady: mySeat !== null && readySeats.has(mySeat),
  };
}

function buildLobbyPlayers(loaded: LoadedGame): LobbyPlayer[] {
  const now = Date.now();
  return loaded.players.map((p) => ({
    seat: p.seat,
    displayName: p.display_name,
    isBot: p.is_bot,
    team: p.team,
    connected: isSeatLive(loaded, p.seat, now, PRESENCE_STALE_MS),
  }));
}

export function buildView(loaded: LoadedGame, uid: string | null): GameView {
  const { game, players } = loaded;
  const mySeat = seatOf(uid, players);
  const lobbyPlayers = buildLobbyPlayers(loaded);
  const view = game.state && mySeat !== null ? redactForSeat(game, mySeat as 0 | 1 | 2 | 3) : null;
  const isHost = uid !== null && game.host_user_id === uid;
  const hostSeat = players.find((p) => p.user_id === game.host_user_id)?.seat ?? null;
  const myMissedTurnsInRow = players.find((p) => p.seat === mySeat)?.missed_turns_in_row ?? 0;
  return {
    gameId: game.id,
    roomCode: game.room_code,
    gameType: game.game_type,
    status: game.status,
    settings: game.settings,
    version: game.version,
    players: lobbyPlayers,
    mySeat,
    view,
    turnStartedAt: view ? new Date(game.turn_started_at).getTime() : null,
    myMissedTurnsInRow,
    hostUserId: game.host_user_id,
    hostSeat,
    isHost,
    botViews: isHost ? buildBotViews(loaded) : undefined,
    nextDealGate: bouillaNextDealGate(loaded, mySeat),
  };
}
