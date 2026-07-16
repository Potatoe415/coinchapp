import { describe, expect, it } from "vitest";
import { cardId } from "./cards";
import { applyPlay, legalCards, trickWinner } from "./trick";
import { card, playingState } from "./test-utils";

const ids = (cards: { rank: string; suit: string }[]) => cards.map((c) => `${c.rank}${c.suit}`).sort();

describe("legalCards", () => {
  it("forces following the led suit when possible", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("7", "H"), card("A", "D"), card("7", "S")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    expect(ids(legalCards(state, 0))).toEqual(["7H"]);
  });

  it("allows any card when void in the led suit (no trump to force cutting)", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("A", "D"), card("7", "S")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    expect(ids(legalCards(state, 0))).toEqual(["7S", "AD"]);
  });

  it("allows any card when leading", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("7", "H"), card("A", "D")], [], [], []],
    });
    expect(ids(legalCards(state, 0))).toEqual(["7H", "AD"]);
  });
});

describe("trickWinner", () => {
  it("only led-suit cards can win, highest rank wins", () => {
    const winner = trickWinner([
      { seat: 0, card: card("9", "H") },
      { seat: 1, card: card("A", "S") },
      { seat: 2, card: card("K", "H") },
      { seat: 3, card: card("2", "H") },
    ]);
    expect(winner).toBe(2);
  });
});

describe("applyPlay", () => {
  it("rejects a card that does not follow suit when possible", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("7", "H"), card("A", "D")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    expect(() => applyPlay(state, 0, card("A", "D"))).toThrow("illegal_card");
  });

  it("removes the card and advances the turn", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("7", "H"), card("A", "D")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    const next = applyPlay(state, 0, card("7", "H"));
    expect(next.hands[0].map(cardId)).toEqual(["AD"]);
    expect(next.currentTrick.cards).toHaveLength(2);
    expect(next.turn).toBe(1);
  });

  it("resolves the trick, sets the winner as next leader and moves to scoring after 13 tricks", () => {
    const tricks = Array.from({ length: 12 }, (_, i) => ({
      leader: 0 as const,
      cards: [
        { seat: 0 as const, card: card("2", "H") },
        { seat: 1 as const, card: card("3", "H") },
        { seat: 2 as const, card: card("4", "H") },
        { seat: 3 as const, card: card("5", "H") },
      ],
      winner: 3 as const,
    }));
    const state = playingState({
      turn: 0,
      hands: [[card("6", "S")], [card("7", "S")], [card("8", "S")], [card("9", "S")]],
      tricks,
    });
    let next = applyPlay(state, 0, card("6", "S"));
    next = applyPlay(next, 1, card("7", "S"));
    next = applyPlay(next, 2, card("8", "S"));
    next = applyPlay(next, 3, card("9", "S"));
    expect(next.phase).toBe("scoring");
    expect(next.tricks).toHaveLength(13);
    expect(next.tricks[12].winner).toBe(3);
  });

  it("kingSpades: ends the round the instant the king of spades is captured, not after 13 tricks", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 3, // "kingSpades"
      hands: [[card("K", "S")], [card("2", "H")], [card("3", "H")], [card("4", "H")]],
    });
    let next = applyPlay(state, 0, card("K", "S"));
    next = applyPlay(next, 1, card("2", "H"));
    next = applyPlay(next, 2, card("3", "H"));
    next = applyPlay(next, 3, card("4", "H"));
    expect(next.phase).toBe("scoring");
    expect(next.tricks).toHaveLength(1);
  });

  it("kingSpades: a trick without the king keeps the round going", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 3, // "kingSpades"
      hands: [[card("2", "S")], [card("2", "H")], [card("3", "H")], [card("4", "H")]],
    });
    let next = applyPlay(state, 0, card("2", "S"));
    next = applyPlay(next, 1, card("2", "H"));
    next = applyPlay(next, 2, card("3", "H"));
    next = applyPlay(next, 3, card("4", "H"));
    expect(next.phase).toBe("playing");
    expect(next.tricks).toHaveLength(1);
  });

  it("everything: capturing the king of spades does not end the round early (still needs all 13 tricks)", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 5, // "everything"
      hands: [[card("K", "S")], [card("2", "H")], [card("3", "H")], [card("4", "H")]],
    });
    let next = applyPlay(state, 0, card("K", "S"));
    next = applyPlay(next, 1, card("2", "H"));
    next = applyPlay(next, 2, card("3", "H"));
    next = applyPlay(next, 3, card("4", "H"));
    expect(next.phase).toBe("playing");
    expect(next.tricks).toHaveLength(1);
  });
});
