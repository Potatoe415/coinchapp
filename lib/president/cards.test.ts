import { describe, expect, it } from "vitest";
import { buildDeck, isThreeOfClubs, outranks, RANK_ORDER, rankValue } from "./cards";

describe("buildDeck", () => {
  it("builds a full 52-card pack, 13 ranks x 4 suits", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});

describe("rankValue / outranks", () => {
  it("orders 2 as the strongest, 3 as the weakest, without a revolution", () => {
    expect(rankValue("2", false)).toBeGreaterThan(rankValue("A", false));
    expect(rankValue("3", false)).toBe(0);
    expect(outranks("2", "A", false)).toBe(true);
  });

  it("reverses the order under a revolution", () => {
    expect(outranks("2", "A", true)).toBe(false);
    expect(outranks("3", "2", true)).toBe(true);
  });

  it("has all 13 ranks", () => {
    expect(RANK_ORDER).toHaveLength(13);
  });
});

describe("isThreeOfClubs", () => {
  it("identifies only the 3 of clubs", () => {
    expect(isThreeOfClubs({ rank: "3", suit: "C" })).toBe(true);
    expect(isThreeOfClubs({ rank: "3", suit: "H" })).toBe(false);
    expect(isThreeOfClubs({ rank: "4", suit: "C" })).toBe(false);
  });
});
