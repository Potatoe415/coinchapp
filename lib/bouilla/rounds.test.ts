import { describe, expect, it } from "vitest";
import { trickPenalty } from "./rounds";
import { card } from "./test-utils";
import type { Trick } from "./types";

function trickOf(cards: ReturnType<typeof card>[]): Trick {
  return { leader: 0, cards: cards.map((c, seat) => ({ seat: seat as 0 | 1 | 2 | 3, card: c })), winner: 0 };
}

describe("trickPenalty", () => {
  it("tricks: flat 5 points regardless of content", () => {
    const trick = trickOf([card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")]);
    expect(trickPenalty("tricks", trick, false)).toBe(5);
  });

  it("clubs: 10 points per club in the trick", () => {
    const trick = trickOf([card("2", "C"), card("3", "C"), card("4", "H"), card("5", "H")]);
    expect(trickPenalty("clubs", trick, false)).toBe(20);
  });

  it("queens: 20 points per queen in the trick", () => {
    const trick = trickOf([card("Q", "C"), card("Q", "H"), card("4", "H"), card("5", "H")]);
    expect(trickPenalty("queens", trick, false)).toBe(40);
  });

  it("kingSpades: 50 points only if the king of spades is in the trick", () => {
    const withKing = trickOf([card("K", "S"), card("3", "H"), card("4", "H"), card("5", "H")]);
    const withoutKing = trickOf([card("K", "H"), card("3", "H"), card("4", "H"), card("5", "H")]);
    expect(trickPenalty("kingSpades", withKing, false)).toBe(50);
    expect(trickPenalty("kingSpades", withoutKing, false)).toBe(0);
  });

  it("lastTrick: 100 points only when it is the last trick", () => {
    const trick = trickOf([card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")]);
    expect(trickPenalty("lastTrick", trick, true)).toBe(100);
    expect(trickPenalty("lastTrick", trick, false)).toBe(0);
  });

  it("everything: sums every rule on the same trick", () => {
    const trick = trickOf([card("K", "S"), card("Q", "S"), card("2", "C"), card("3", "H")]);
    // 5 (trick) + 10 (1 club) + 20 (1 queen) + 50 (king of spades) + 100 (last trick) = 185
    expect(trickPenalty("everything", trick, true)).toBe(185);
  });
});
