import { redact, type PlayerView } from "@/lib/coinche";
import type { GameSettings, GameStatus } from "@/lib/supabase/types";
import { seatOf, type LoadedGame } from "./repo";

export interface LobbyPlayer {
  seat: number;
  displayName: string;
  isBot: boolean;
  team: "A" | "B";
  connected: boolean;
}

export interface GameView {
  gameId: string;
  roomCode: string;
  status: GameStatus;
  settings: GameSettings;
  version: number;
  players: LobbyPlayer[];
  mySeat: number | null;
  view: PlayerView | null;
  /** User id of the client that runs the bots. */
  hostUserId: string | null;
  /** Seat of the host, or null if the host has no seat. */
  hostSeat: number | null;
  /** Whether the caller is the host (and thus the bot runner). */
  isHost: boolean;
  /** Redacted per-seat views for every bot seat. Present only for the host. */
  botViews?: Record<number, PlayerView>;
}

function buildBotViews(loaded: LoadedGame): Record<number, PlayerView> {
  const { game, players } = loaded;
  const botViews: Record<number, PlayerView> = {};
  if (!game.state) return botViews;
  for (const player of players) {
    if (player.is_bot) botViews[player.seat] = redact(game.state, player.seat as 0 | 1 | 2 | 3);
  }
  return botViews;
}

export function buildView(loaded: LoadedGame, uid: string | null): GameView {
  const { game, players } = loaded;
  const mySeat = seatOf(uid, players);
  const lobbyPlayers: LobbyPlayer[] = players.map((p) => ({
    seat: p.seat,
    displayName: p.display_name,
    isBot: p.is_bot,
    team: p.team,
    connected: p.connected,
  }));
  const view =
    game.state && mySeat !== null ? redact(game.state, mySeat as 0 | 1 | 2 | 3) : null;
  const isHost = uid !== null && game.host_user_id === uid;
  const hostSeat = players.find((p) => p.user_id === game.host_user_id)?.seat ?? null;
  return {
    gameId: game.id,
    roomCode: game.room_code,
    status: game.status,
    settings: game.settings,
    version: game.version,
    players: lobbyPlayers,
    mySeat,
    view,
    hostUserId: game.host_user_id,
    hostSeat,
    isHost,
    botViews: isHost ? buildBotViews(loaded) : undefined,
  };
}
