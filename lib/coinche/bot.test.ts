import { describe, expect, it } from "vitest";
import { leadWinnersWhenTrumpsExhausted } from "./bot";
import type { Card, Rank, Suit } from "./types";

function card(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

/** All trump (spades) ranks except the two kept in hand, as already-played cards. */
const SIX_SPADES_PLAYED: Card[] = (["7", "8", "9", "10", "J", "Q"] as Rank[]).map((r) =>
  card("S", r),
);

describe("leadWinnersWhenTrumpsExhausted", () => {
  it("drops trump leads when no trump is left outside and a non-trump master exists", () => {
    const hand = [card("S", "A"), card("S", "K"), card("H", "A"), card("H", "7")];
    const result = leadWinnersWhenTrumpsExhausted(hand, hand, SIX_SPADES_PLAYED, true, "S");
    expect(result).toEqual([card("H", "A"), card("H", "7")]);
  });

  it("keeps trumps when no sure non-trump winner exists", () => {
    const hand = [card("S", "A"), card("S", "K"), card("H", "7")];
    const result = leadWinnersWhenTrumpsExhausted(hand, hand, SIX_SPADES_PLAYED, true, "S");
    expect(result).toEqual(hand);
  });

  it("does nothing while trumps are still outstanding", () => {
    const hand = [card("S", "A"), card("H", "A"), card("H", "7")];
    const played = [card("S", "7"), card("S", "8")];
    const result = leadWinnersWhenTrumpsExhausted(hand, hand, played, true, "S");
    expect(result).toEqual(hand);
  });

  it("does nothing when not leading", () => {
    const hand = [card("S", "A"), card("S", "K"), card("H", "A")];
    const result = leadWinnersWhenTrumpsExhausted(hand, hand, SIX_SPADES_PLAYED, false, "S");
    expect(result).toEqual(hand);
  });

  it("does nothing in sans-atout or tout-atout", () => {
    const hand = [card("H", "A"), card("H", "7")];
    expect(leadWinnersWhenTrumpsExhausted(hand, hand, [], true, "SA")).toEqual(hand);
    expect(leadWinnersWhenTrumpsExhausted(hand, hand, [], true, "TA")).toEqual(hand);
  });
});
