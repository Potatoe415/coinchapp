import { describe, expect, it } from "vitest";
import { chooseCard } from "./bot";
import { legalCards } from "./trick";
import { card, playingState } from "./test-utils";
import { redact } from "./redact";

describe("chooseCard", () => {
  it("sheds the dangerous card when it is guaranteed to lose anyway", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 3, // kingSpades
      hands: [[card("K", "S"), card("2", "S")], [], [], []],
      trick: [{ seat: 3, card: card("A", "S") }],
    });
    const chosen = chooseCard(redact(state, 0));
    // Both cards are legal (must follow spades) and both are guaranteed to lose behind
    // the Ace already played: get rid of the dangerous King while it is safe to do so.
    expect(legalCards(state, 0).some((c) => c.rank === chosen.rank && c.suit === chosen.suit)).toBe(true);
    expect(chosen.rank).toBe("K");
  });

  it("never returns a card outside the legal set", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 5, // everything
      hands: [[card("Q", "S"), card("7", "S"), card("K", "S")], [], [], []],
      trick: [{ seat: 3, card: card("9", "S") }],
    });
    const legal = legalCards(state, 0);
    const chosen = chooseCard(redact(state, 0));
    expect(legal).toEqual(expect.arrayContaining([expect.objectContaining(chosen)]));
  });

  it("dumps the most dangerous card when void and forced to discard", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 1, // clubs
      hands: [[card("7", "C"), card("2", "H")], [], [], []],
      trick: [{ seat: 3, card: card("9", "S") }],
    });
    const chosen = chooseCard(redact(state, 0));
    expect(chosen.suit).toBe("C"); // shed the dangerous club since this discard can never win.
  });
});
