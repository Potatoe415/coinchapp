import { describe, expect, it } from "vitest";
import { cardId } from "./cards";
import { beginNextDeal, createInitialState, dealHands, shuffle } from "./deal";
import { buildDeck } from "./cards";
import { seededRng } from "./test-utils";

describe("shuffle", () => {
  it("keeps every card (permutation only)", () => {
    const deck = buildDeck();
    const shuffled = shuffle(deck, seededRng(42));
    expect(shuffled).toHaveLength(32);
    expect(new Set(shuffled.map(cardId))).toEqual(new Set(deck.map(cardId)));
  });

  it("is deterministic for a given seed", () => {
    const a = shuffle(buildDeck(), seededRng(7)).map(cardId);
    const b = shuffle(buildDeck(), seededRng(7)).map(cardId);
    expect(a).toEqual(b);
  });
});

describe("dealHands", () => {
  it("gives 8 cards to each seat", () => {
    const hands = dealHands(buildDeck());
    expect(hands.map((h) => h.length)).toEqual([8, 8, 8, 8]);
    const all = hands.flat().map(cardId);
    expect(new Set(all).size).toBe(32);
  });
});

describe("beginNextDeal", () => {
  it("opens bidding, rotates the dealer and seats the opener", () => {
    const state = beginNextDeal(createInitialState(1000), seededRng(1));
    expect(state.phase).toBe("bidding");
    expect(state.dealer).toBe(0);
    expect(state.turn).toBe(1);
    expect(state.hands.every((h) => h.length === 8)).toBe(true);
  });
});
