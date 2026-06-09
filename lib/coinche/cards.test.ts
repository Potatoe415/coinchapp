import { describe, expect, it } from "vitest";
import {
  buildDeck,
  cardId,
  cardPoints,
  cardStrength,
  partnerOf,
  teamOf,
} from "./cards";

describe("deck", () => {
  it("has 32 unique cards", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(32);
    expect(new Set(deck.map(cardId)).size).toBe(32);
  });
});

describe("cardPoints", () => {
  it("scores trump cards (J=20, 9=14)", () => {
    expect(cardPoints({ rank: "J", suit: "H" }, "H")).toBe(20);
    expect(cardPoints({ rank: "9", suit: "H" }, "H")).toBe(14);
  });

  it("scores plain cards (A=11, J=2)", () => {
    expect(cardPoints({ rank: "A", suit: "H" }, "S")).toBe(11);
    expect(cardPoints({ rank: "J", suit: "H" }, "S")).toBe(2);
  });

  it("totals 152 points over the deck for any trump", () => {
    const total = buildDeck().reduce((sum, c) => sum + cardPoints(c, "C"), 0);
    expect(total).toBe(152);
  });
});

describe("cardStrength", () => {
  it("ranks the trump Jack as the strongest card", () => {
    const jack = cardStrength({ rank: "J", suit: "S" }, "H", "S");
    const nine = cardStrength({ rank: "9", suit: "S" }, "H", "S");
    expect(jack).toBeGreaterThan(nine);
  });

  it("makes any trump beat the led suit", () => {
    const trump7 = cardStrength({ rank: "7", suit: "S" }, "H", "S");
    const ledAce = cardStrength({ rank: "A", suit: "H" }, "H", "S");
    expect(trump7).toBeGreaterThan(ledAce);
  });

  it("gives off-suit non-trump cards zero strength", () => {
    expect(cardStrength({ rank: "A", suit: "D" }, "H", "S")).toBe(0);
  });
});

describe("teams", () => {
  it("pairs seats across the table", () => {
    expect(teamOf(0)).toBe("A");
    expect(teamOf(2)).toBe("A");
    expect(teamOf(1)).toBe("B");
    expect(partnerOf(0)).toBe(2);
    expect(partnerOf(1)).toBe(3);
  });
});
