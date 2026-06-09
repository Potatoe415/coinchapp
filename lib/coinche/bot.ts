import { bidOptions } from "./bidding";
import { cardPoints, cardStrength, SUITS } from "./cards";
import { legalCards, trickWinner } from "./trick";
import type { Bid, Card, GameState, Suit } from "./types";

export type Difficulty = "easy" | "medium" | "hard";

/** Rough estimate of a suit's value as trump, plus off-suit aces. */
function evaluateSuit(hand: Card[], suit: Suit): number {
  let points = 0;
  for (const card of hand) {
    if (card.suit === suit) points += cardPoints(card, suit);
    else if (card.rank === "A") points += 11;
    else if (card.rank === "10") points += 5;
  }
  const trumpCount = hand.filter((c) => c.suit === suit).length;
  return points + trumpCount * 3;
}

function bestSuit(hand: Card[]): { suit: Suit; estimate: number } {
  let best: { suit: Suit; estimate: number } = { suit: "H", estimate: -1 };
  for (const suit of SUITS) {
    const estimate = evaluateSuit(hand, suit);
    if (estimate > best.estimate) best = { suit, estimate };
  }
  return best;
}

export function chooseBid(state: GameState): Bid {
  const seat = state.turn;
  const options = bidOptions(state);
  const { suit, estimate } = bestSuit(state.hands[seat]);
  if (options.minValue !== null && estimate >= options.minValue) {
    const value = Math.min(160, Math.max(options.minValue, Math.floor(estimate / 10) * 10));
    return { seat, type: "bid", value, suit };
  }
  return { seat, type: "pass" };
}

function pickRandom<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function weakest(cards: Card[], trump: Suit | null): Card {
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

export function chooseCard(
  state: GameState,
  difficulty: Difficulty = "medium",
  rng: () => number = Math.random,
): Card {
  const legal = legalCards(state, state.turn);
  if (difficulty === "easy") return pickRandom(legal, rng);
  const winner = cheapestWinner(state, legal);
  return winner ?? weakest(legal, state.trump);
}
