import { describe, expect, it } from "vitest";
import { chooseCard } from "./bot";
import { beginNextDeal, createInitialState } from "./deal";
import { submitBid, submitPlay } from "./engine";
import { seededRng } from "./test-utils";
import type { GameState, Seat } from "./types";

function forceContract(state: GameState, rng: () => number): GameState {
  let s = submitBid(state, { seat: 1, type: "bid", value: 80, suit: "H" }, rng);
  while (s.phase === "bidding") {
    s = submitBid(s, { seat: s.turn, type: "pass" }, rng);
  }
  return s;
}

function playOut(state: GameState, rng: () => number): GameState {
  let s = state;
  let guard = 0;
  while (s.phase === "playing" && guard++ < 40) {
    const cardChoice = chooseCard(s, "medium", rng);
    s = submitPlay(s, s.turn as Seat, cardChoice);
  }
  return s;
}

describe("full deal playthrough", () => {
  it("completes a scored deal for many shuffles without illegal moves", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = seededRng(seed);
      const opened = beginNextDeal(createInitialState(1000), rng);
      const playing = forceContract(opened, rng);
      const done = playOut(playing, rng);

      expect(done.tricks).toHaveLength(8);
      expect(["scoring", "finished"]).toContain(done.phase);
      expect(done.hands.every((h) => h.length === 0)).toBe(true);
      expect(done.lastDeal).toBeDefined();
      expect(done.scores.A + done.scores.B).toBeGreaterThan(0);
    }
  });
});
