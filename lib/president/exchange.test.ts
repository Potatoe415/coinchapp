import { describe, expect, it } from "vitest";
import { applyExchangeReturn, computeForcedTransfers, validateExchangeReturn } from "./exchange";
import { card, exchangeState } from "./test-utils";
import type { Titles } from "./types";

const titles: Titles = ["president", "vicePresident", "viceTrouDuCul", "trouDuCul"];

describe("computeForcedTransfers", () => {
  it("moves the Trou du Cul's 2 highest cards to the President, and the Vice-Trou du Cul's highest to the Vice-President", () => {
    const hands = [
      [card("4", "H")], // president
      [card("5", "H")], // vice-president
      [card("6", "H"), card("9", "H")], // vice-trou du cul: 9 is highest
      [card("2", "H"), card("A", "H"), card("K", "H")], // trou du cul: 2 and A are the 2 highest
    ];
    const { hands: next, transfers } = computeForcedTransfers(titles, hands);
    expect(next[0]).toEqual(expect.arrayContaining([card("4", "H"), card("2", "H"), card("A", "H")]));
    expect(next[3]).toEqual([card("K", "H")]);
    expect(next[1]).toEqual(expect.arrayContaining([card("5", "H"), card("9", "H")]));
    expect(next[2]).toEqual([card("6", "H")]);
    expect(transfers[0]).toEqual({ from: 3, to: 0, cards: [card("2", "H"), card("A", "H")] });
    expect(transfers[1]).toEqual({ from: 2, to: 1, cards: [card("9", "H")] });
  });
});

describe("validateExchangeReturn / applyExchangeReturn", () => {
  function baseState() {
    return exchangeState({
      hands: [
        [card("4", "H"), card("2", "H"), card("A", "H")],
        [card("5", "H"), card("9", "H")],
        [card("6", "H")],
        [card("K", "H")],
      ],
      titles,
      awaiting: [0, 1],
      owed: { 0: 2, 1: 1, 2: 0, 3: 0 },
    });
  }

  it("rejects a return with the wrong count, a card not in hand, or out of turn", () => {
    const state = baseState();
    expect(validateExchangeReturn(state, 0, [card("4", "H")])).toBe(false); // owes 2
    expect(validateExchangeReturn(state, 0, [card("4", "H"), card("Q", "H")])).toBe(false); // not in hand
    expect(validateExchangeReturn(state, 1, [card("5", "H")])).toBe(false); // not seat 1's turn yet
  });

  it("moves to the Vice-President's turn after the President returns", () => {
    const state = baseState();
    const next = applyExchangeReturn(state, 0, [card("2", "H"), card("A", "H")]);
    expect(next.phase).toBe("exchange");
    expect(next.turn).toBe(1);
    expect(next.hands[0]).toEqual([card("4", "H")]);
    expect(next.hands[3]).toEqual(expect.arrayContaining([card("K", "H"), card("2", "H"), card("A", "H")]));
  });

  it("opens play (led by the Trou du Cul) once both returns are done", () => {
    let state = baseState();
    state = applyExchangeReturn(state, 0, [card("2", "H"), card("A", "H")]);
    state = applyExchangeReturn(state, 1, [card("9", "H")]);
    expect(state.phase).toBe("playing");
    expect(state.turn).toBe(3);
    expect(state.pendingExchange).toBeNull();
    expect(state.hands[2]).toEqual(expect.arrayContaining([card("6", "H"), card("9", "H")]));
  });
});
