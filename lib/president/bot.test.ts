import { describe, expect, it } from "vitest";
import { chooseAction } from "./bot";
import { redact } from "./redact";
import { card, exchangeState, playingState } from "./test-utils";
import type { Titles } from "./types";

describe("chooseAction", () => {
  it("plays the smallest legal combo when one is available", () => {
    const state = playingState({
      turn: 1,
      hands: [[], [card("K", "S"), card("A", "D")], [], []],
    });
    const action = chooseAction(redact(state, 1));
    expect(action.action).toBe("COMBO");
    if (action.action === "COMBO") expect(action.combo.rank).toBe("K");
  });

  it("passes when no legal combo exists", () => {
    const state = playingState({
      turn: 1,
      hands: [[], [card("3", "H")], [], []],
      pile: { combo: { rank: "A", cards: [card("A", "S")] }, leader: 0 },
    });
    const action = chooseAction(redact(state, 1));
    expect(action).toEqual({ action: "PASS" });
  });

  it("returns the lowest-ranked owed cards during the exchange phase", () => {
    const titles: Titles = ["president", "vicePresident", "viceTrouDuCul", "trouDuCul"];
    const state = exchangeState({
      hands: [[card("2", "H"), card("3", "H"), card("K", "H")], [], [], []],
      titles,
      awaiting: [0, 1],
      owed: { 0: 2, 1: 0, 2: 0, 3: 0 },
    });
    const action = chooseAction(redact(state, 0));
    expect(action).toEqual({ action: "EXCHANGE_RETURN", cards: [card("3", "H"), card("K", "H")] });
  });
});
