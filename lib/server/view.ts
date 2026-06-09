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
  return {
    gameId: game.id,
    roomCode: game.room_code,
    status: game.status,
    settings: game.settings,
    version: game.version,
    players: lobbyPlayers,
    mySeat,
    view,
  };
}
