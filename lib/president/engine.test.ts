import { describe, expect, it } from "vitest";
import { advanceBots } from "./bot";
import { beginNextRound, createInitialState } from "./deal";
import { markReadyForNextRound, startNextRound, submitPass, submitPlay } from "./engine";
import { seededRng } from "./test-utils";

const ALL_BOTS = [true, true, true, true];

describe("engine integration (bots play a full match)", () => {
  it("round 0 plays out via bots to scoring, with all 4 seats ranked", () => {
    const dealt = beginNextRound(createInitialState(4), seededRng(1));
    const scored = advanceBots(dealt, ALL_BOTS);
    expect(scored.phase).toBe("scoring");
    expect(scored.finishedOrder).toHaveLength(4);
    expect(new Set(scored.finishedOrder)).toEqual(new Set([0, 1, 2, 3]));
    expect(scored.totalScores.reduce((a, b) => a + b, 0)).toBe(1 + 2 + 3 + 4);
  });

  it("round 1 goes through the exchange phase (bots choose returns) before playing resumes", () => {
    const round0 = advanceBots(beginNextRound(createInitialState(2), seededRng(3)), ALL_BOTS);
    const dealtRound1 = startNextRound(round0, seededRng(4));
    expect(dealtRound1.phase).toBe("exchange");
    const scoredRound1 = advanceBots(dealtRound1, ALL_BOTS);
    expect(scoredRound1.phase).toBe("finished"); // roundsToPlay = 2
    expect(scoredRound1.winners).toBeDefined();
    expect(scoredRound1.roundHistory).toHaveLength(2);
  });

  it("markReadyForNextRound records a ready seat only during scoring, without duplicates", () => {
    const scored = advanceBots(beginNextRound(createInitialState(4), seededRng(5)), ALL_BOTS);
    let next = markReadyForNextRound(scored, 0);
    next = markReadyForNextRound(next, 0);
    expect(next.readySeats).toEqual([0]);
  });

  it("clears readySeats once the next round starts", () => {
    const scored = advanceBots(beginNextRound(createInitialState(4), seededRng(5)), ALL_BOTS);
    const ready = markReadyForNextRound(scored, 0);
    const next = startNextRound(ready, seededRng(6));
    expect(next.readySeats).toBeUndefined();
  });

  it("submitPlay/submitPass reject a move made out of turn", () => {
    const dealt = beginNextRound(createInitialState(4), seededRng(1));
    const otherSeat = dealt.turn === 0 ? 1 : 0;
    expect(() => submitPass(dealt, otherSeat)).toThrow();
    const combo = dealt.hands[otherSeat].slice(0, 1).map((c) => ({ rank: c.rank, cards: [c] }))[0];
    expect(() => submitPlay(dealt, otherSeat, combo)).toThrow();
  });
});
