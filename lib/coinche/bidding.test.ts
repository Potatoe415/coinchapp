import { describe, expect, it } from "vitest";
import { applyBid } from "./bidding";
import { beginNextDeal, createInitialState } from "./deal";
import { seededRng } from "./test-utils";
import type { GameState } from "./types";

function biddingState(): GameState {
  return beginNextDeal(createInitialState(500), seededRng(3));
}

describe("applyBid", () => {
  it("seats the opener to the left of the dealer", () => {
    const state = biddingState();
    expect(state.dealer).toBe(0);
    expect(state.turn).toBe(1);
  });

  it("settles the contract after a bid and three passes", () => {
    let state = biddingState();
    state = applyBid(state, { seat: 1, type: "bid", value: 80, suit: "H" });
    state = applyBid(state, { seat: 2, type: "pass" });
    state = applyBid(state, { seat: 3, type: "pass" });
    state = applyBid(state, { seat: 0, type: "pass" });
    expect(state.phase).toBe("playing");
    expect(state.contract).toMatchObject({ seat: 1, team: "B", value: 80, suit: "H", coinche: 1 });
    expect(state.trump).toBe("H");
    expect(state.turn).toBe(1);
  });

  it("rejects a bid that is not higher than the current one", () => {
    let state = biddingState();
    state = applyBid(state, { seat: 1, type: "bid", value: 80, suit: "H" });
    expect(() => applyBid(state, { seat: 2, type: "bid", value: 80, suit: "S" })).toThrow(
      "bid_too_low",
    );
  });

  it("doubles with a coinche and quadruples with a surcoinche", () => {
    let state = biddingState();
    state = applyBid(state, { seat: 1, type: "bid", value: 90, suit: "D" });
    state = applyBid(state, { seat: 2, type: "coinche" });
    expect(state.turn).toBe(1);
    state = applyBid(state, { seat: 1, type: "surcoinche" });
    expect(state.phase).toBe("playing");
    expect(state.contract?.coinche).toBe(4);
  });

  it("ends the auction at coinche if the bidder passes the surcoinche", () => {
    let state = biddingState();
    state = applyBid(state, { seat: 1, type: "bid", value: 90, suit: "D" });
    state = applyBid(state, { seat: 2, type: "coinche" });
    state = applyBid(state, { seat: 1, type: "pass" });
    expect(state.phase).toBe("playing");
    expect(state.contract?.coinche).toBe(2);
  });

  it("flags a redeal when everyone passes", () => {
    let state = biddingState();
    state = applyBid(state, { seat: 1, type: "pass" });
    state = applyBid(state, { seat: 2, type: "pass" });
    state = applyBid(state, { seat: 3, type: "pass" });
    state = applyBid(state, { seat: 0, type: "pass" });
    expect(state.pendingRedeal).toBe(true);
    expect(state.phase).toBe("bidding");
  });
});
