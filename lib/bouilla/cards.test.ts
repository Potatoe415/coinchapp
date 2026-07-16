import { describe, expect, it } from "vitest";
import { buildDeck, cardStrength, isClub, isKingOfSpades, isQueen, RANKS } from "./cards";

describe("buildDeck", () => {
  it("builds a full 52-card pack, 13 ranks x 4 suits", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map((c) => `${c.rank}${c.suit}`));
    expect(ids.size).toBe(52);
  });
});

describe("cardStrength", () => {
  it("orders ace high, 2 low", () => {
    expect(cardStrength({ rank: "2", suit: "S" })).toBeLessThan(cardStrength({ rank: "K", suit: "S" }));
    expect(cardStrength({ rank: "K", suit: "S" })).toBeLessThan(cardStrength({ rank: "A", suit: "S" }));
  });

  it("has the expected number of distinct ranks", () => {
    expect(RANKS).toHaveLength(13);
  });
});

describe("danger predicates", () => {
  it("identifies clubs, queens and the king of spades", () => {
    expect(isClub({ rank: "7", suit: "C" })).toBe(true);
    expect(isClub({ rank: "7", suit: "H" })).toBe(false);
    expect(isQueen({ rank: "Q", suit: "D" })).toBe(true);
    expect(isKingOfSpades({ rank: "K", suit: "S" })).toBe(true);
    expect(isKingOfSpades({ rank: "K", suit: "H" })).toBe(false);
  });
});
