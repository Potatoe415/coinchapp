import type { Team } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";

export function seatTeam(seat: number): Team {
  return seat % 2 === 0 ? "A" : "B";
}

export function otherTeam(team: Team): Team {
  return team === "A" ? "B" : "A";
}

export function relativeSeat(mySeat: number, offset: number): number {
  return (mySeat + offset) % 4;
}

export function playerName(gv: GameView, seat: number): string {
  return gv.players.find((p) => p.seat === seat)?.displayName ?? `Siège ${seat + 1}`;
}

/** Whether the seat's responsible party (the seat's own user, or the host
 * for a bot seat) has called `getView` recently - see `lib/server/repo.ts`. */
export function isConnected(gv: GameView, seat: number): boolean {
  return gv.players.find((p) => p.seat === seat)?.connected ?? true;
}
