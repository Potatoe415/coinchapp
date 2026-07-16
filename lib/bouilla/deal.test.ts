import { describe, expect, it } from "vitest";
import { createInitialState, dealHands } from "./deal";
import { buildDeck, nextSeat } from "./cards";
import { seededRng } from "./test-utils";
import { shuffle } from "@/lib/cards";

describe("dealHands", () => {
  it("deals the full 52-card pack evenly, 13 cards per seat", () => {
    const hands = dealHands(shuffle(buildDeck(), seededRng(42)));
    expect(hands.map((h) => h.length)).toEqual([13, 13, 13, 13]);
    const all = hands.flat();
    expect(new Set(all.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});

describe("createInitialState", () => {
  it("starts in the lobby with round 0 and every score at zero", () => {
    const state = createInitialState();
    expect(state.phase).toBe("lobby");
    expect(state.roundIndex).toBe(0);
    expect(state.totalScores).toEqual([0, 0, 0, 0]);
  });
});

describe("nextSeat", () => {
  it("wraps clockwise 0->1->2->3->0", () => {
    expect(nextSeat(3)).toBe(0);
  });
});
