import {
  chooseBid,
  chooseCard,
  submitBid,
  submitPlay,
  type Difficulty,
  type GameState,
  type Seat,
} from "@/lib/coinche";

/** Auto-play bot seats until it is a human's turn or the deal ends. */
export function advanceBots(
  state: GameState,
  isBot: boolean[],
  difficulty: Difficulty,
  rng: () => number = Math.random,
): GameState {
  let current = state;
  let guard = 0;
  while (guard++ < 64) {
    const active = current.phase === "bidding" || current.phase === "playing";
    if (!active || !isBot[current.turn]) break;
    if (current.phase === "bidding") {
      current = submitBid(current, chooseBid(current), rng);
    } else {
      current = submitPlay(current, current.turn as Seat, chooseCard(current, difficulty, rng));
    }
  }
  return current;
}
