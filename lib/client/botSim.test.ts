import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_RULES } from "@/lib/coinche";
import type { Card, PlayerView, Rank, Suit } from "@/lib/coinche";
import { buildDeterminizer } from "./botSim";

function card(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

/** Deterministic LCG so the test is reproducible across runs. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Seat 0's view after one trick where seat 1 cut a club lead with a heart
 * (trump = H), so seat 1 is publicly void in clubs.
 */
function viewWithClubVoidOnSeat1(): PlayerView {
  return {
    mySeat: 0,
    phase: "playing",
    dealer: 3,
    turn: 1,
    trump: "H",
    contract: { seat: 1, team: "B", value: 80, suit: "H", coinche: 1 },
    bids: [],
    myHand: [
      card("C", "10"),
      card("S", "A"),
      card("S", "K"),
      card("S", "Q"),
      card("D", "A"),
      card("D", "K"),
      card("D", "Q"),
    ],
    legalCards: [],
    bidOptions: null,
    handCounts: [7, 7, 7, 7],
    currentTrick: { leader: 1, cards: [] },
    tricks: [
      {
        leader: 0,
        winner: 1,
        cards: [
          { seat: 0, card: card("C", "7") },
          { seat: 1, card: card("H", "7") },
          { seat: 2, card: card("C", "8") },
          { seat: 3, card: card("C", "9") },
        ],
      },
    ],
    lastTrick: null,
    tricksWon: { A: 0, B: 1 },
    scores: { A: 0, B: 0 },
    targetPoints: 1000,
    scoringRules: DEFAULT_SCORING_RULES,
    lastDeal: null,
    winner: null,
    beloteAnnounced: [],
  };
}

describe("determinizer void tracking", () => {
  it("never deals a known-void suit to the voided seat", () => {
    const view = viewWithClubVoidOnSeat1();
    const determinizer = buildDeterminizer(view, makeRng(42));
    for (let i = 0; i < 500; i++) {
      const world = determinizer.next();
      const seat1Clubs = world.hands[1].filter((c) => c.suit === "C");
      expect(seat1Clubs).toHaveLength(0);
    }
  });

  it("preserves each seat's hand size", () => {
    const view = viewWithClubVoidOnSeat1();
    const determinizer = buildDeterminizer(view, makeRng(7));
    for (let i = 0; i < 100; i++) {
      const world = determinizer.next();
      expect(world.hands.map((h) => h.length)).toEqual([7, 7, 7, 7]);
    }
  });
});
