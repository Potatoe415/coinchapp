import { describe, expect, it } from "vitest";
import { roundDecidedEarly, sweepAliveFor, sweepWinner, trickMattersForSweep, trickPenalty } from "./rounds";
import { card } from "./test-utils";
import type { PlayedCard, Rank, Seat, Trick } from "./types";

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

describe("roundDecidedEarly", () => {
  it("kingSpades: decided the instant the king of spades appears in any trick", () => {
    const withKing = [trickOf([card("K", "S"), card("2", "H"), card("3", "H"), card("4", "H")])];
    const withoutKing = [trickOf([card("2", "S"), card("2", "H"), card("3", "H"), card("4", "H")])];
    expect(roundDecidedEarly("kingSpades", withKing)).toBe(true);
    expect(roundDecidedEarly("kingSpades", withoutKing)).toBe(false);
  });

  it("queens: decided once all 4 queens have fallen, across any number of tricks or seats", () => {
    const allInOneTrick = [trickOf([card("Q", "H"), card("Q", "D"), card("Q", "C"), card("Q", "S")], 3)];
    expect(roundDecidedEarly("queens", allInOneTrick)).toBe(true);

    const spreadAcrossSeats = [
      trickOf([card("Q", "H"), card("2", "D"), card("3", "C"), card("4", "S")], 0),
      trickOf([card("Q", "D"), card("Q", "C"), card("Q", "S"), card("2", "H")], 1),
    ];
    expect(roundDecidedEarly("queens", spreadAcrossSeats)).toBe(true);

    const onlyThree = [trickOf([card("Q", "H"), card("Q", "D"), card("Q", "C"), card("2", "S")], 0)];
    expect(roundDecidedEarly("queens", onlyThree)).toBe(false);
  });

  it("every other round always needs the full round", () => {
    expect(roundDecidedEarly("tricks", allTricksWonBy(0, 12))).toBe(false);
    expect(roundDecidedEarly("clubs", allTricksWonBy(0, 13))).toBe(false);
    expect(roundDecidedEarly("lastTrick", allTricksWonBy(0, 13))).toBe(false);
    expect(roundDecidedEarly("everything", allTricksWonBy(0, 13))).toBe(false);
  });
});

describe("sweepAliveFor", () => {
  it("tricks/everything: alive for the seat that has won every trick so far, dead for everyone else", () => {
    const soFar = allTricksWonBy(1, 6);
    expect(sweepAliveFor(1, "tricks", soFar)).toBe(true);
    expect(sweepAliveFor(0, "tricks", soFar)).toBe(false);
    expect(sweepAliveFor(1, "everything", soFar)).toBe(true);
  });

  it("tricks: dies for everyone the moment a second seat wins a trick", () => {
    const split = [...allTricksWonBy(0, 3), ...allTricksWonBy(1, 1)];
    expect(sweepAliveFor(0, "tricks", split)).toBe(false);
    expect(sweepAliveFor(1, "tricks", split)).toBe(false);
  });

  it("queens: alive for the seat that has collected every queen seen so far, even across several tricks", () => {
    const soFar: Trick[] = [
      trickOf([card("Q", "H"), card("2", "D"), card("3", "C"), card("4", "S")], 2),
      trickOf([card("5", "H"), card("6", "D"), card("7", "C"), card("8", "S")], 0), // no queen: doesn't count against seat 2
      trickOf([card("Q", "D"), card("Q", "C"), card("Q", "S"), card("9", "H")], 2),
    ];
    expect(sweepAliveFor(2, "queens", soFar)).toBe(true);
    expect(sweepAliveFor(0, "queens", soFar)).toBe(false);
  });

  it("kingSpades/lastTrick: never alive (single-event rounds have no sweep)", () => {
    expect(sweepAliveFor(0, "kingSpades", allTricksWonBy(0, 5))).toBe(false);
    expect(sweepAliveFor(0, "lastTrick", allTricksWonBy(0, 5))).toBe(false);
  });
});

describe("trickMattersForSweep", () => {
  function cardsOf(cards: ReturnType<typeof card>[]): PlayedCard[] {
    return cards.map((c, seat) => ({ seat: seat as Seat, card: c }));
  }

  it("tricks/everything: every trick matters, even before any card is played", () => {
    expect(trickMattersForSweep("tricks", [])).toBe(true);
    expect(trickMattersForSweep("everything", cardsOf([card("2", "H")]))).toBe(true);
  });

  it("clubs/queens: only a trick that already holds the tracked card matters", () => {
    expect(trickMattersForSweep("clubs", cardsOf([card("2", "H"), card("3", "C")]))).toBe(true);
    expect(trickMattersForSweep("clubs", cardsOf([card("2", "H"), card("3", "D")]))).toBe(false);
    expect(trickMattersForSweep("queens", cardsOf([card("Q", "S")]))).toBe(true);
    expect(trickMattersForSweep("queens", [])).toBe(false);
  });

  it("kingSpades/lastTrick: never matters (no sweep to break)", () => {
    expect(trickMattersForSweep("kingSpades", cardsOf([card("K", "S")]))).toBe(false);
    expect(trickMattersForSweep("lastTrick", cardsOf([card("A", "H")]))).toBe(false);
  });
});
