import { describe, expect, it } from "vitest";
import { beginNextRound, createInitialState, dealHands } from "./deal";
import { buildDeck } from "./cards";
import { seededRng } from "./test-utils";
import { shuffle } from "@/lib/cards";
import type { RoundResult, Titles } from "./types";

describe("dealHands", () => {
  it("deals the full 52-card pack evenly, 13 cards per seat", () => {
    const hands = dealHands(shuffle(buildDeck(), seededRng(42)));
    expect(hands.map((h) => h.length)).toEqual([13, 13, 13, 13]);
    expect(new Set(hands.flat().map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});

describe("createInitialState", () => {
  it("starts in the lobby with round 0, no titles, every score at zero", () => {
    const state = createInitialState(4);
    expect(state.phase).toBe("lobby");
    expect(state.roundIndex).toBe(0);
    expect(state.titles).toBeNull();
    expect(state.totalScores).toEqual([0, 0, 0, 0]);
    expect(state.roundsToPlay).toBe(4);
  });
});

describe("beginNextRound", () => {
  it("round 0 (no titles): deals 13 each and opens playing, led by whoever holds the 3 of clubs", () => {
    const state = beginNextRound(createInitialState(4), seededRng(1));
    expect(state.phase).toBe("playing");
    expect(state.hands.map((h) => h.length)).toEqual([13, 13, 13, 13]);
    expect(state.hands[state.turn].some((c) => c.rank === "3" && c.suit === "C")).toBe(true);
  });

  it("round >= 1 (titles set): deals, applies the forced exchange, opens the exchange phase", () => {
    const titles: Titles = ["president", "vicePresident", "viceTrouDuCul", "trouDuCul"];
    const base = { ...createInitialState(4), roundIndex: 1, titles };
    const state = beginNextRound(base, seededRng(2));
    expect(state.phase).toBe("exchange");
    // President (+2) and Vice-President (+1) grew; Trou du Cul (-2) and
    // Vice-Trou du Cul (-1) shrank.
    expect(state.hands.map((h) => h.length)).toEqual([15, 14, 12, 11]);
    expect(state.pendingExchange).toEqual({ awaiting: [0, 1], owed: { 0: 2, 1: 1 } });
    expect(state.turn).toBe(0);
  });

  it("clears the previous round's lastRoundResult - otherwise the round-end overlay never leaves (PresidentTable.tsx's roundOverlayVisible stays truthy), blocking round 2+'s exchange phase", () => {
    const titles: Titles = ["president", "vicePresident", "viceTrouDuCul", "trouDuCul"];
    const previousResult: RoundResult = { roundIndex: 0, finishedOrder: [0, 1, 2, 3], titles };
    const base = { ...createInitialState(4), roundIndex: 1, titles, lastRoundResult: previousResult };
    const state = beginNextRound(base, seededRng(3));
    expect(state.lastRoundResult).toBeNull();
  });
});
