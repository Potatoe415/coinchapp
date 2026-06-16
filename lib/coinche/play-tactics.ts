import { avoidCuttingPartner, leadWinnersWhenTrumpsExhausted } from "./bot";
import { buildDeck, cardId, cardPoints, cardStrength, isTrump, partnerOf, RANKS, teamOf, trumpStrength } from "./cards";
import { trickWinner } from "./trick";
import type { PlayerView } from "./redact";
import type { Card, Contract, PlayedCard, Seat, Suit, TrumpMode } from "./types";

/**
 * Deterministic play heuristics layered on top of the existing candidate
 * filters. Each function narrows the candidate set for the real (root) move and
 * always falls back to its input when its rule does not fire, so it can never
 * starve the ISMCTS search. The search "brain" itself is untouched.
 */

function countTrumps(cards: Card[], trump: TrumpMode | null): number {
  let n = 0;
  for (const card of cards) if (isTrump(card, trump)) n += 1;
  return n;
}

/** Trumps not yet seen between this hand and public play (single-suit only). */
function outstandingTrumps(hand: Card[], played: Card[], trump: TrumpMode | null): number {
  return RANKS.length - countTrumps(hand, trump) - countTrumps(played, trump);
}

/** Do I hold the strongest trump still unaccounted for? */
function holdsMasterTrump(hand: Card[], played: Card[], trump: Suit): boolean {
  const myTrumps = hand.filter((c) => c.suit === trump);
  if (myTrumps.length === 0) return false;
  const myBest = Math.max(...myTrumps.map((c) => trumpStrength(c)));
  const seen = new Set([...hand, ...played].map(cardId));
  for (const rank of RANKS) {
    const card: Card = { suit: trump, rank };
    if (seen.has(cardId(card))) continue;
    if (trumpStrength(card) > myBest) return false;
  }
  return true;
}

/** Partner already wins this trick and I am the last to play: a sure team win. */
function partnerSureWinner(trick: PlayedCard[], trump: TrumpMode | null, mySeat: Seat): boolean {
  if (trick.length !== 3) return false;
  return trickWinner(trick, trump) === partnerOf(mySeat);
}

/**
 * Partner is winning the trick and the win is certain: either I am the last to
 * play, or no card still in play (unseen by me) can beat the partner's card.
 */
function partnerWinSecure(
  trick: PlayedCard[],
  hand: Card[],
  played: Card[],
  trump: TrumpMode | null,
  mySeat: Seat,
): boolean {
  if (trickWinner(trick, trump) !== partnerOf(mySeat)) return false;
  if (trick.length === 3) return true;
  const led = trick[0].card.suit;
  const top = cardStrength(trick.find((p) => p.seat === partnerOf(mySeat))!.card, led, trump);
  const seen = new Set([...hand, ...played].map(cardId));
  return !buildDeck().some((c) => !seen.has(cardId(c)) && cardStrength(c, led, trump) > top);
}

/**
 * Rule 1 + 4a — single-suit trump, leading: pull the opponents' trumps when
 * some remain and either I hold the master trump, or my partner is the declarer
 * (lead trump for the taker). Restricts the lead to trumps in that case.
 */
export function leadTrumpToPull(
  legal: Card[],
  hand: Card[],
  played: Card[],
  isLeading: boolean,
  trump: TrumpMode | null,
  mySeat: Seat,
  contract: Contract | null,
): Card[] {
  if (!isLeading || !trump || trump === "TA" || trump === "SA") return legal;
  const trumps = legal.filter((c) => isTrump(c, trump));
  if (trumps.length === 0 || outstandingTrumps(hand, played, trump) <= 0) return legal;
  const partnerIsTaker = contract?.seat === partnerOf(mySeat);
  if (holdsMasterTrump(hand, played, trump) || partnerIsTaker) return trumps;
  return legal;
}

/**
 * Rule 3 — sans atout, leading in the first three tricks: cash an ace (always a
 * master in SA) to bank tricks while opponents still have to follow.
 */
export function cashAcesEarly(
  legal: Card[],
  isLeading: boolean,
  trump: TrumpMode | null,
  completedTricks: number,
): Card[] {
  if (trump !== "SA" || !isLeading || completedTricks >= 3) return legal;
  const aces = legal.filter((c) => c.rank === "A");
  return aces.length > 0 ? aces : legal;
}

/**
 * Rule 2 — sans atout: never expose a 10 while the ace of its suit is unknown
 * (not yet played and not in my hand). Exempted when the partner is the sure
 * winner of the trick, where handing them the 10 banks the points.
 */
export function protectUnguardedTen(
  legal: Card[],
  hand: Card[],
  played: Card[],
  trick: PlayedCard[],
  trump: TrumpMode | null,
  mySeat: Seat,
): Card[] {
  if (trump !== "SA" || partnerSureWinner(trick, trump, mySeat)) return legal;
  const seen = new Set([...hand, ...played].map(cardId));
  const safe = legal.filter(
    (c) => c.rank !== "10" || seen.has(cardId({ suit: c.suit, rank: "A" })),
  );
  return safe.length > 0 ? safe : legal;
}

/**
 * Rule 4b — never overtake a partner who is the certain winner of the trick
 * (any partner, not only the declarer): drop cards that beat their winning card
 * so the trick is kept for the team. Skipped when the win is not yet secure, so
 * the search can still overtake to wrest a contested trick.
 */
export function dontOvertakePartner(
  legal: Card[],
  trick: PlayedCard[],
  hand: Card[],
  played: Card[],
  trump: TrumpMode | null,
  mySeat: Seat,
): Card[] {
  if (trick.length === 0 || !partnerWinSecure(trick, hand, played, trump, mySeat)) return legal;
  const led = trick[0].card.suit;
  const top = cardStrength(trick.find((p) => p.seat === partnerOf(mySeat))!.card, led, trump);
  const safe = legal.filter((c) => cardStrength(c, led, trump) < top);
  return safe.length > 0 ? safe : legal;
}

/**
 * Rule 5 — when the trick is lost for sure (an opponent leads, no legal card can
 * beat it, and my partner has already played), shed the fewest points possible.
 */
export function dumpLowWhenLosing(
  legal: Card[],
  trick: PlayedCard[],
  trump: TrumpMode | null,
  mySeat: Seat,
): Card[] {
  if (trick.length === 0) return legal;
  const winner = trickWinner(trick, trump);
  if (teamOf(winner) === teamOf(mySeat)) return legal;
  const led = trick[0].card.suit;
  const top = cardStrength(trick.find((p) => p.seat === winner)!.card, led, trump);
  if (legal.some((c) => cardStrength(c, led, trump) > top)) return legal;
  if (!trick.some((p) => p.seat === partnerOf(mySeat))) return legal;
  const min = Math.min(...legal.map((c) => cardPoints(c, trump)));
  return legal.filter((c) => cardPoints(c, trump) === min);
}

/**
 * Compose all play heuristics for the real (root) move, preserving order so
 * each filter refines the previous one. Returns the candidate cards the search
 * should consider; never empty.
 */
export function refinePlayCandidates(view: PlayerView, played: Card[], isLeading: boolean): Card[] {
  const { trump, myHand, mySeat, contract, tricks } = view;
  const trick = view.currentTrick.cards;
  let cand = avoidCuttingPartner(view.legalCards, trick, trump, mySeat);
  if (isLeading) {
    cand = cashAcesEarly(cand, true, trump, tricks.length);
    cand = protectUnguardedTen(cand, myHand, played, trick, trump, mySeat);
    cand = leadWinnersWhenTrumpsExhausted(cand, myHand, played, true, trump);
    cand = leadTrumpToPull(cand, myHand, played, true, trump, mySeat, contract);
  } else {
    cand = dontOvertakePartner(cand, trick, myHand, played, trump, mySeat);
    cand = protectUnguardedTen(cand, myHand, played, trick, trump, mySeat);
    cand = dumpLowWhenLosing(cand, trick, trump, mySeat);
  }
  return cand;
}
