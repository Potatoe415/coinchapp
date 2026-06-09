import { describe, expect, it } from "vitest";
import { cardId } from "./cards";
import { applyPlay, legalCards, trickWinner } from "./trick";
import { card, playingState } from "./test-utils";

const ids = (cards: { rank: string; suit: string }[]) =>
  cards.map((c) => `${c.rank}${c.suit}`).sort();

describe("legalCards", () => {
  it("forces following the led suit", () => {
    const state = playingState({
      trump: "S",
      turn: 0,
      hands: [[card("7", "H"), card("A", "D"), card("7", "S")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    expect(ids(legalCards(state, 0))).toEqual(["7H"]);
  });

  it("forces cutting when void in the led suit and partner is not master", () => {
    const state = playingState({
      trump: "S",
      turn: 0,
      hands: [[card("A", "D"), card("7", "S"), card("J", "S")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    expect(ids(legalCards(state, 0))).toEqual(["7S", "JS"]);
  });

  it("forces over-trumping when a higher trump is available", () => {
    const state = playingState({
      trump: "S",
      turn: 0,
      hands: [[card("Q", "S"), card("7", "D")], [], [], []],
      trick: [
        { seat: 1, card: card("A", "H") },
        { seat: 3, card: card("8", "S") },
      ],
    });
    expect(ids(legalCards(state, 0))).toEqual(["QS"]);
  });

  it("allows under-trumping when no higher trump exists", () => {
    const state = playingState({
      trump: "S",
      turn: 0,
      hands: [[card("8", "S"), card("Q", "S"), card("7", "D")], [], [], []],
      trick: [
        { seat: 1, card: card("A", "H") },
        { seat: 3, card: card("J", "S") },
      ],
    });
    expect(ids(legalCards(state, 0))).toEqual(["8S", "QS"]);
  });

  it("lets a player discard when the partner is master", () => {
    const state = playingState({
      trump: "S",
      turn: 0,
      hands: [[card("7", "S"), card("A", "D")], [], [], []],
      trick: [{ seat: 2, card: card("A", "H") }],
    });
    expect(ids(legalCards(state, 0))).toEqual(["7S", "AD"]);
  });
});

describe("trickWinner", () => {
  it("awards the trick to the highest trump", () => {
    const winner = trickWinner(
      [
        { seat: 0, card: card("A", "H") },
        { seat: 1, card: card("7", "S") },
        { seat: 2, card: card("10", "H") },
        { seat: 3, card: card("8", "S") },
      ],
      "S",
    );
    expect(winner).toBe(3);
  });
});

describe("applyPlay", () => {
  it("rejects an illegal card", () => {
    const state = playingState({
      trump: "S",
      turn: 0,
      hands: [[card("7", "H"), card("A", "D")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    expect(() => applyPlay(state, 0, card("A", "D"))).toThrow("illegal_card");
  });

  it("removes the card and advances the turn", () => {
    const state = playingState({
      trump: "S",
      turn: 0,
      hands: [[card("7", "H"), card("A", "D")], [], [], []],
      trick: [{ seat: 3, card: card("9", "H") }],
    });
    const next = applyPlay(state, 0, card("7", "H"));
    expect(next.hands[0].map(cardId)).toEqual(["AD"]);
    expect(next.currentTrick.cards).toHaveLength(2);
    expect(next.turn).toBe(1);
  });
});
