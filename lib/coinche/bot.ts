import { bidOptions } from "./bidding";
import { cardPoints, cardStrength } from "./cards";
import { submitBid, submitPlay } from "./engine";
import { legalCards, trickWinner } from "./trick";
import type { Bid, Card, GameState, Seat, Suit, TrumpMode } from "./types";

/** Lowest contract a bot will open, and the highest it will bid unprompted. */
const MIN_OPEN_BID = 80;
const MAX_AUTO_BID = 160;

/** Bot bidding aggressiveness ("punch") chosen before the game starts. */
export type BotPunch = "low" | "med" | "high";
export const BOT_PUNCH_LEVELS: BotPunch[] = ["low", "med", "high"];

/**
 * Points a partner + the 10 de der are assumed to add on top of the bidder's
 * own hand strength, per punch level. A contract only needs the team (two
 * hands) to reach the announced value, so a single hand worth far less than 80
 * is still biddable. Calibrated by simulation (4000 deals/value):
 * low(20) ~91% contract / avg 88, med(26) ~99% / avg 92.5, high(32) 100% / avg 98.
 * Higher levels open more and bid higher at the cost of more failed contracts.
 */
export const PUNCH_CONTRIBUTION: Record<BotPunch, number> = { low: 20, med: 26, high: 32 };

/** Does the hand hold the K+Q of `suit` (belote, worth a guaranteed 20)? */
function hasBelote(hand: Card[], suit: Suit): boolean {
  let king = false;
  let queen = false;
  for (const card of hand) {
    if (card.suit !== suit) continue;
    if (card.rank === "K") king = true;
    else if (card.rank === "Q") queen = true;
  }
  return king && queen;
}

/** Rough estimate of a suit's value as trump: trump points, length, off-suit aces/tens, belote. */
function evaluateSuit(hand: Card[], suit: Suit): number {
  let points = 0;
  for (const card of hand) {
    if (card.suit === suit) points += cardPoints(card, suit);
    else if (card.rank === "A") points += 11;
    else if (card.rank === "10") points += 5;
  }
  const trumpCount = hand.filter((c) => c.suit === suit).length;
  return points + trumpCount * 3 + (hasBelote(hand, suit) ? 20 : 0);
}

/** Tout atout potential, normalized to the /162 scale; jacks and nines dominate. */
function evaluateToutAtout(hand: Card[]): number {
  let raw = 0;
  for (const card of hand) raw += cardPoints(card, "TA");
  const jacks = hand.filter((c) => c.rank === "J").length;
  const nines = hand.filter((c) => c.rank === "9").length;
  return Math.round(raw * (162 / 214)) + jacks * 5 + nines * 3;
}

/** Sans atout potential: aces and tens carry the hand, no cutting. */
function evaluateSansAtout(hand: Card[]): number {
  let points = 0;
  for (const card of hand) points += cardPoints(card, "SA");
  const aces = hand.filter((c) => c.rank === "A").length;
  const tens = hand.filter((c) => c.rank === "10").length;
  return points + aces * 4 + tens * 2;
}

function evaluateMode(hand: Card[], mode: TrumpMode): number {
  if (mode === "TA") return evaluateToutAtout(hand);
  if (mode === "SA") return evaluateSansAtout(hand);
  return evaluateSuit(hand, mode);
}

/** Best trump mode among the allowed ones, or null when none can be announced. */
function bestMode(hand: Card[], allowed: TrumpMode[]): { mode: TrumpMode; estimate: number } | null {
  let best: { mode: TrumpMode; estimate: number } | null = null;
  for (const mode of allowed) {
    const estimate = evaluateMode(hand, mode);
    if (!best || estimate > best.estimate) best = { mode, estimate };
  }
  return best;
}

export interface BidDecision {
  shouldBid: boolean;
  value: number;
  mode: TrumpMode;
}

/**
 * Decide whether to announce, and at what value, from a hand alone.
 * `minValue` is the lowest legal bid (null when bidding is locked or no bid is
 * possible). The hand estimate is lifted by an assumed partner contribution,
 * rounded to a contract step, then capped so bots never auto-bid capot/générale.
 */
export function decideBid(
  hand: Card[],
  allowed: TrumpMode[],
  minValue: number | null,
  partnerContribution: number = PUNCH_CONTRIBUTION.med,
): BidDecision {
  if (minValue === null) return { shouldBid: false, value: 0, mode: "H" };
  const best = bestMode(hand, allowed);
  if (!best) return { shouldBid: false, value: 0, mode: "H" };
  const teamEstimate = best.estimate + partnerContribution;
  const value = Math.min(MAX_AUTO_BID, Math.round(teamEstimate / 10) * 10);
  const shouldBid = value >= Math.max(MIN_OPEN_BID, minValue);
  return { shouldBid, value, mode: best.mode };
}

export function chooseBid(state: GameState): Bid {
  const seat = state.turn;
  const { minValue, suits } = bidOptions(state);
  const decision = decideBid(state.hands[seat], suits, minValue);
  if (decision.shouldBid) {
    return { seat, type: "bid", value: decision.value, suit: decision.mode };
  }
  return { seat, type: "pass" };
}

function weakest(cards: Card[], trump: TrumpMode | null): Card {
  return cards.reduce((lo, c) =>
    cardPoints(c, trump) < cardPoints(lo, trump) ? c : lo,
  );
}

/** Lowest card that would currently win the trick, or null if none can. */
function cheapestWinner(state: GameState, legal: Card[]): Card | null {
  const trick = state.currentTrick.cards;
  if (trick.length === 0) return null;
  const led = trick[0].card.suit;
  const bestStrength = cardStrength(
    trick.find((p) => p.seat === trickWinner(trick, state.trump))!.card,
    led,
    state.trump,
  );
  const winners = legal.filter((c) => cardStrength(c, led, state.trump) > bestStrength);
  if (winners.length === 0) return null;
  return weakest(winners, state.trump);
}

/** Single bot strategy: play the cheapest card that wins, else discard the weakest. */
export function chooseCard(state: GameState): Card {
  const legal = legalCards(state, state.turn);
  const winner = cheapestWinner(state, legal);
  return winner ?? weakest(legal, state.trump);
}

/** Auto-play bot seats until it is a human's turn or the deal ends. */
export function advanceBots(
  state: GameState,
  isBot: boolean[],
  rng: () => number = Math.random,
): GameState {
  let current = state;
  let guard = 0;
  while (guard++ < 64) {
    const active = current.phase === "bidding" || current.phase === "playing";
    if (!active || !isBot[current.turn]) break;
    if (current.phase === "bidding") {
      current = submitBid(current, chooseBid(current), rng);
    } else {
      current = submitPlay(current, current.turn as Seat, chooseCard(current));
    }
  }
  return current;
}
