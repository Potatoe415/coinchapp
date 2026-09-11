import { describe, expect, it } from "vitest";
import { applyPass, applyPlay, canPass, legalCombos } from "./play";
import { card, combo, playingState } from "./test-utils";

describe("legalCombos / canPass", () => {
  it("only offers combos that match the pile's count and outrank it", () => {
    const state = playingState({
      turn: 1,
      hands: [[], [card("K", "S"), card("K", "H"), card("5", "D")], [], []],
      pile: { combo: combo("7", [card("7", "H"), card("7", "D")]), leader: 0 },
    });
    const combos = legalCombos(state, 1);
    expect(combos).toHaveLength(1);
    expect(combos[0].rank).toBe("K");
    expect(combos[0].cards).toHaveLength(2);
  });

  it("cannot pass when leading a freshly cleared pile", () => {
    const state = playingState({ turn: 0, hands: [[card("5", "H")], [], [], []] });
    expect(canPass(state, 0)).toBe(false);
  });

  it("can pass onto an existing pile", () => {
    const state = playingState({
      turn: 1,
      hands: [[], [card("5", "H")], [], []],
      pile: { combo: combo("7", [card("7", "H")]), leader: 0 },
    });
    expect(canPass(state, 1)).toBe(true);
  });
});

describe("applyPlay", () => {
  it("rejects a combo with the wrong count or a weaker rank", () => {
    const state = playingState({
      turn: 1,
      hands: [[], [card("K", "S"), card("5", "D")], [], []],
      pile: { combo: combo("7", [card("7", "H"), card("7", "D")]), leader: 0 },
    });
    expect(() => applyPlay(state, 1, combo("K", [card("K", "S")]))).toThrow("illegal_combo");
    expect(() => applyPlay(state, 1, combo("5", [card("5", "D"), card("K", "S")]))).toThrow();
  });

  it("toggles the revolution when a quad is played", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("7", "H"), card("7", "D"), card("7", "C"), card("7", "S")], [], [], []],
    });
    const next = applyPlay(state, 0, combo("7", state.hands[0]));
    expect(next.revolution).toBe(true);
  });

  it("ends the round the instant a 3rd seat empties its hand, auto-ranking the 4th last", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("5", "H")], [], [], [card("K", "S"), card("2", "H")]],
      finishedOrder: [1, 2],
    });
    const next = applyPlay(state, 0, combo("5", [card("5", "H")]));
    expect(next.phase).toBe("scoring");
    expect(next.finishedOrder).toEqual([1, 2, 0, 3]);
  });

  it("a '2' burns the pile instantly: clears it and the same seat leads again", () => {
    const state = playingState({
      turn: 1,
      hands: [[], [card("2", "H"), card("3", "D")], [card("5", "C")], [card("6", "S")]],
      pile: { combo: combo("7", [card("7", "H")]), leader: 0 },
    });
    const next = applyPlay(state, 1, combo("2", [card("2", "H")]));
    expect(next.pile).toEqual({ combo: null, leader: null });
    expect(next.turn).toBe(1);
    expect(next.passStreak).toBe(0);
    expect(next.lastBurn).toEqual({ seat: 1, combo: combo("2", [card("2", "H")]) });
  });

  it("a double or triple '2' also burns the pile (a quad still just revolutions)", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("2", "H"), card("2", "D"), card("3", "C")], [], [], []],
    });
    const next = applyPlay(state, 0, combo("2", [card("2", "H"), card("2", "D")]));
    expect(next.pile.combo).toBeNull();
    expect(next.turn).toBe(0);
  });

  it("does not burn when playing a '2' empties the hand (finishing play keeps the normal flow)", () => {
    const state = playingState({
      turn: 0,
      hands: [[card("2", "H")], [card("5", "D")], [card("6", "C")], [card("7", "S")]],
    });
    const next = applyPlay(state, 0, combo("2", [card("2", "H")]));
    expect(next.pile.combo).not.toBeNull();
    expect(next.lastBurn).toBeNull();
    expect(next.turn).not.toBe(0);
  });
});

describe("applyPass", () => {
  it("clears the pile once every other active seat has passed, turn returns to the leader", () => {
    let state = playingState({
      turn: 1,
      hands: [[card("K", "S")], [card("3", "H")], [card("3", "D")], [card("3", "C")]],
      pile: { combo: combo("7", [card("7", "H"), card("7", "D")]), leader: 0 },
    });
    state = applyPass(state, 1);
    expect(state.pile.combo).not.toBeNull();
    state = applyPass(state, 2);
    expect(state.pile.combo).not.toBeNull();
    state = applyPass(state, 3);
    expect(state.pile.combo).toBeNull();
    expect(state.passStreak).toBe(0);
    expect(state.turn).toBe(0);
  });
});
