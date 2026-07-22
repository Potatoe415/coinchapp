import { describe, expect, it } from "vitest";
import { chooseCard } from "./bot";
import { legalCards } from "./trick";
import { card, playingState } from "./test-utils";
import { redact } from "./redact";
import type { Seat, Trick } from "./types";

/** N filler completed tricks (content/winner chosen per test), used to seed
 *  `chooseCard`'s view of round history without affecting the current trick. */
function completedTrick(cards: ReturnType<typeof card>[], winner: Seat): Trick {
  return { leader: 0, cards: cards.map((c, seat) => ({ seat: seat as Seat, card: c })), winner };
}

describe("chooseCard", () => {
  it("sheds the dangerous card when it is guaranteed to lose anyway", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 3, // kingSpades
      hands: [[card("K", "S"), card("2", "S")], [], [], []],
      trick: [{ seat: 3, card: card("A", "S") }],
    });
    const chosen = chooseCard(redact(state, 0));
    // Both cards are legal (must follow spades) and both are guaranteed to lose behind
    // the Ace already played: get rid of the dangerous King while it is safe to do so.
    expect(legalCards(state, 0).some((c) => c.rank === chosen.rank && c.suit === chosen.suit)).toBe(true);
    expect(chosen.rank).toBe("K");
  });

  it("never returns a card outside the legal set", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 5, // everything
      hands: [[card("Q", "S"), card("7", "S"), card("K", "S")], [], [], []],
      trick: [{ seat: 3, card: card("9", "S") }],
    });
    const legal = legalCards(state, 0);
    const chosen = chooseCard(redact(state, 0));
    expect(legal).toEqual(expect.arrayContaining([expect.objectContaining(chosen)]));
  });

  it("dumps the most dangerous card when void and forced to discard", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 1, // clubs
      hands: [[card("7", "C"), card("2", "H")], [], [], []],
      trick: [{ seat: 3, card: card("9", "S") }],
    });
    const chosen = chooseCard(redact(state, 0));
    expect(chosen.suit).toBe("C"); // shed the dangerous club since this discard can never win.
  });

  it("prefers dumping a queen over a club when neither has fallen yet", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 5, // everything
      hands: [[card("7", "C"), card("Q", "H")], [], [], []],
      trick: [{ seat: 3, card: card("9", "S") }],
    });
    expect(chooseCard(redact(state, 0)).rank).toBe("Q");
  });

  it("dynamic danger: a club still in play gets riskier as fewer copies remain unseen, flipping the priority", () => {
    // 11 of the 13 clubs already fallen, split between two winners so neither seat
    // is mid-sweep (that would otherwise switch this bot into "try to win" mode).
    const filler: Trick[] = Array.from({ length: 11 }, (_, i) =>
      completedTrick([card("2", "C"), card("3", "H"), card("4", "H"), card("5", "H")], i % 2 === 0 ? 2 : 3),
    );
    const state = playingState({
      turn: 0,
      roundIndex: 5, // everything
      hands: [[card("7", "C"), card("Q", "H")], [], [], []],
      trick: [{ seat: 3, card: card("9", "S") }],
      tricks: filler,
    });
    // Only 2 clubs remain unseen vs. all 4 queens still out there: the club we're
    // holding is now the more dangerous discard, unlike with no history above.
    expect(chooseCard(redact(state, 0)).suit).toBe("C");
  });

  it("leads into the suit more opponents are void in, among equally-safe candidates", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 3, // kingSpades: irrelevant to either candidate card, so danger ties at 0
      hands: [[card("5", "H"), card("5", "D")], [], [], []],
      // Seat 1 didn't follow the led diamond, so it is now known void in diamonds.
      tricks: [completedTrick([card("2", "D"), card("3", "H"), card("4", "D"), card("5", "D")], 0)],
    });
    expect(chooseCard(redact(state, 0)).suit).toBe("D");
  });

  it("Capot: keeps trying to win instead of ducking once its own sweep is still alive", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 0, // tricks
      hands: [[card("2", "H"), card("K", "H")], [], [], []],
      trick: [{ seat: 3, card: card("5", "H") }],
      // Seat 0 (me) has won every trick so far - ducking now would throw away the Capot.
      tricks: [completedTrick([card("2", "S"), card("3", "S"), card("4", "S"), card("6", "S")], 0)],
    });
    expect(chooseCard(redact(state, 0)).rank).toBe("K"); // wins cheaply instead of the safe 2H duck.
  });

  it("Capot: overtakes to break an opponent's sweep instead of ducking behind it", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 0, // tricks
      hands: [[card("2", "H"), card("K", "H")], [], [], []],
      trick: [{ seat: 3, card: card("5", "H") }],
      // Seat 3 has won every trick so far: let it through here and the Capot is theirs.
      tricks: [completedTrick([card("2", "S"), card("3", "S"), card("4", "S"), card("6", "S")], 3)],
    });
    expect(chooseCard(redact(state, 0)).rank).toBe("K");
  });

  it("does not switch to try-to-win mode on the very first trick of a round, before any evidence of a Capot exists", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 0, // tricks
      hands: [[card("3", "H"), card("A", "H")], [], [], []],
      trick: [{ seat: 3, card: card("5", "H") }],
      tricks: [], // no completed tricks yet this round: sweepAliveFor must not be vacuously true
    });
    // Before the fix, `[].every(...)` made sweepAliveFor vacuously true for every seat,
    // so the bot would try to win with the Ace instead of ducking behind the led 5.
    expect(chooseCard(redact(state, 0)).rank).toBe("3");
  });

  it("leads the lowest safe card, not the highest, on an empty-tricks first lead of the round", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 0, // tricks
      hands: [[card("2", "H"), card("A", "H")], [], [], []],
      trick: [],
      tricks: [],
    });
    expect(chooseCard(redact(state, 0)).rank).toBe("2");
  });

  it("lastTrick: near the end of the round, protects a held control card (Q/K/A) over exploiting a void-suit lead", () => {
    const voidCreatingTrick = completedTrick([card("2", "H"), card("3", "D"), card("4", "H"), card("5", "H")], 2);
    const spadesFiller = Array.from({ length: 9 }, () =>
      completedTrick([card("2", "S"), card("3", "S"), card("4", "S"), card("5", "S")], 1),
    );
    const state = playingState({
      turn: 0,
      roundIndex: 4, // lastTrick
      hands: [[card("5", "D"), card("K", "H")], [], [], []],
      trick: [],
      tricks: [voidCreatingTrick, ...spadesFiller], // 10 tricks played -> only 3 left, inside the late-round window
    });
    // Seat 1 is void in hearts (didn't follow the "2H" lead above), so the old logic
    // would prefer leading the King of Hearts to bait seat 1's free discard. With only
    // 3 tricks left, the King is now flagged as a control card worth protecting instead.
    expect(chooseCard(redact(state, 0)).suit).toBe("D");
  });

  it("does not lead a bare, unbeatable card just because it carries no tracked danger of its own", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 5, // everything
      hands: [[card("A", "S"), card("Q", "H")], [], [], []],
      trick: [],
      tricks: [],
    });
    // Before the fix, the Ace of Spades looked "safest" to lead (it isn't the king of
    // spades, a queen, or a club, so it scored zero tracked danger) - but it is
    // unbeatable and guarantees winning the trick, inviting a void opponent to safely
    // dump something far worse (e.g. the actual king of spades) straight into it.
    expect(chooseCard(redact(state, 0)).rank).toBe("Q");
  });

  it("Capot: leads a held queen to grab it away from an opponent sweeping the queens round", () => {
    const state = playingState({
      turn: 0,
      roundIndex: 2, // queens
      hands: [[card("2", "D"), card("Q", "D")], [], [], []],
      // Seat 3 has collected the only queen seen so far - still on track to sweep.
      tricks: [completedTrick([card("Q", "H"), card("3", "S"), card("4", "S"), card("6", "S")], 3)],
    });
    // Leading the safe 2D would let seat 3 keep coasting toward the sweep; grab the
    // contested queen instead, even though it would normally be the card to hide.
    expect(chooseCard(redact(state, 0)).rank).toBe("Q");
  });
});
