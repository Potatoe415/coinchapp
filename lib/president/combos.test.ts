import { describe, expect, it } from "vitest";
import { combosInHand, isLegalCombo, isValidComboShape } from "./combos";
import { card, combo } from "./test-utils";

describe("combosInHand", () => {
  it("groups by rank, including every sub-count of a group", () => {
    const hand = [card("7", "H"), card("7", "D"), card("7", "C"), card("K", "S")];
    const combos = combosInHand(hand);
    const counts = combos.filter((c) => c.rank === "7").map((c) => c.cards.length).sort();
    expect(counts).toEqual([1, 2, 3]);
    expect(combos.some((c) => c.rank === "K" && c.cards.length === 1)).toBe(true);
  });
});

describe("isValidComboShape", () => {
  const hand = [card("7", "H"), card("7", "D"), card("K", "S")];

  it("accepts same-rank cards actually present in hand", () => {
    expect(isValidComboShape(hand, combo("7", [card("7", "H"), card("7", "D")]))).toBe(true);
  });

  it("rejects mixed ranks, duplicate cards, or cards not in hand", () => {
    expect(isValidComboShape(hand, combo("7", [card("7", "H"), card("K", "S")]))).toBe(false);
    expect(isValidComboShape(hand, combo("7", [card("7", "H"), card("7", "H")]))).toBe(false);
    expect(isValidComboShape(hand, combo("7", [card("7", "H"), card("7", "C")]))).toBe(false);
  });
});

describe("isLegalCombo", () => {
  it("allows any count 1-4 onto an empty pile", () => {
    expect(isLegalCombo({ combo: null, leader: null }, false, combo("7", [card("7", "H"), card("7", "D")]))).toBe(true);
  });

  it("requires the same count and a stronger rank than the pile's top", () => {
    const pile = { combo: combo("7", [card("7", "H"), card("7", "D")]), leader: 0 as const };
    expect(isLegalCombo(pile, false, combo("K", [card("K", "S"), card("K", "H")]))).toBe(true);
    expect(isLegalCombo(pile, false, combo("K", [card("K", "S")]))).toBe(false); // wrong count
    expect(isLegalCombo(pile, false, combo("5", [card("5", "S"), card("5", "H")]))).toBe(false); // weaker
  });

  it("flips the comparison under a revolution", () => {
    const pile = { combo: combo("K", [card("K", "H")]), leader: 0 as const };
    expect(isLegalCombo(pile, true, combo("5", [card("5", "S")]))).toBe(true);
    expect(isLegalCombo(pile, true, combo("A", [card("A", "S")]))).toBe(false);
  });
});
