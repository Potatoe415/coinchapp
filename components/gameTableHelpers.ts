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
