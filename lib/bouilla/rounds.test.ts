import { describe, expect, it } from "vitest";
import { sweepWinner, trickPenalty } from "./rounds";
import { card } from "./test-utils";
import type { Rank, Seat, Trick } from "./types";

function trickOf(cards: ReturnType<typeof card>[], winner: Seat = 0): Trick {
  return { leader: 0, cards: cards.map((c, seat) => ({ seat: seat as Seat, card: c })), winner };
}

/** N filler tricks (content irrelevant to `sweepWinner`'s tricks/everything case),
 *  all won by the same seat - simulates one player taking every trick of a round. */
function allTricksWonBy(seat: Seat, count: number): Trick[] {
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  return Array.from({ length: count }, (_, i) => trickOf([card(ranks[i % ranks.length], "H")], seat));
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

describe("sweepWinner", () => {
  it("tricks/everything: the seat that won all 13 tricks sweeps", () => {
    expect(sweepWinner("tricks", allTricksWonBy(2, 13))).toBe(2);
    expect(sweepWinner("everything", allTricksWonBy(1, 13))).toBe(1);
  });

  it("tricks: no sweep if the tricks are split, or the round isn't complete", () => {
    const split = [...allTricksWonBy(0, 6), ...allTricksWonBy(1, 7)];
    expect(sweepWinner("tricks", split)).toBeNull();
    expect(sweepWinner("tricks", allTricksWonBy(0, 12))).toBeNull();
  });

  it("clubs: the seat that collected all 13 clubs sweeps, across several tricks", () => {
    const tricks: Trick[] = [
      trickOf([card("2", "C"), card("3", "C"), card("4", "C"), card("5", "C")], 2),
      trickOf([card("6", "C"), card("7", "C"), card("8", "C"), card("9", "C")], 2),
      trickOf([card("10", "C"), card("J", "C"), card("Q", "C"), card("K", "C")], 2),
      trickOf([card("A", "C"), card("2", "H"), card("3", "H"), card("4", "H")], 2),
    ];
    expect(sweepWinner("clubs", tricks)).toBe(2);
  });

  it("clubs: no sweep if a single club escaped to another seat", () => {
    const tricks: Trick[] = [
      trickOf([card("2", "C"), card("3", "C"), card("4", "C"), card("5", "C")], 2),
      trickOf([card("6", "C"), card("2", "H"), card("3", "H"), card("4", "H")], 0),
    ];
    expect(sweepWinner("clubs", tricks)).toBeNull();
  });

  it("queens: the seat that collected all 4 queens sweeps, even in one trick", () => {
    const trick = trickOf([card("Q", "H"), card("Q", "D"), card("Q", "C"), card("Q", "S")], 3);
    expect(sweepWinner("queens", [trick])).toBe(3);
  });

  it("kingSpades/lastTrick: never sweep (single-event rounds)", () => {
    expect(sweepWinner("kingSpades", allTricksWonBy(0, 13))).toBeNull();
    expect(sweepWinner("lastTrick", allTricksWonBy(0, 13))).toBeNull();
  });
});
