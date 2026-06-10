import { cardPoints, SUITS, teamOf } from "@/lib/coinche";
import type { Bid, Card, PlayerView, Rank, Suit, TrumpMode } from "@/lib/coinche";
import { buildDeterminizer, simulateRootMove } from "./botSim";

/**
 * Client-side bot brain. Runs entirely in the browser from the redacted seat
 * view, then the UI submits the chosen move through a Server Action exactly as
 * a human would. Bidding uses fast heuristics; playing uses time-boxed ISMCTS.
 */
export type BotAction =
  | { action: "BID"; value: number; suit: TrumpMode }
  | { action: "PASS" }
  | { action: "PLAY"; card: Card };

export interface BotOptions {
  /** Hard wall-clock budget for the play search (ms). */
  timeBudgetMs?: number;
  /** Hard cap on simulated determinizations. */
  maxIterations?: number;
  /** Injectable RNG for deterministic tests. */
  rng?: () => number;
}

const DEFAULT_TIME_BUDGET_MS = 800;
const DEFAULT_MAX_ITERATIONS = 2000;
const MIN_BID = 80;
const MAX_BID = 160;
const UCB_C = Math.SQRT2;

/** Sure-trick value of a trump honor; other trumps contribute nothing certain. */
const SURE_TRUMP_POINTS: Partial<Record<Rank, number>> = { J: 20, "9": 14, A: 11, "10": 10 };

interface RootStat {
  wins: number;
  visits: number;
}

export function chooseClientAction(view: PlayerView, options: BotOptions = {}): BotAction {
  if (view.turn !== view.mySeat) throw new Error("not_your_turn");
  if (view.phase === "bidding") return chooseBidAction(view);
  if (view.phase === "playing") return choosePlayAction(view, options);
  throw new Error("no_action_available");
}

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

/** Heuristic potential of the hand if `suit` were trump (no simulation). */
function trumpPotential(hand: Card[], suit: Suit): number {
  let points = 0;
  for (const card of hand) {
    if (card.suit === suit) points += SURE_TRUMP_POINTS[card.rank] ?? 0;
    else if (card.rank === "A") points += 11;
    else if (card.rank === "10") points += 5;
  }
  return hasBelote(hand, suit) ? points + 20 : points;
}

function highestBid(bids: Bid[]): number {
  let highest = 0;
  for (const bid of bids) {
    if (bid.type === "bid" && bid.value !== undefined) highest = bid.value;
  }
  return highest;
}

/** Tout atout potential, normalized to the /162 scale; jacks and nines dominate. */
function toutAtoutPotential(hand: Card[]): number {
  let raw = 0;
  for (const card of hand) raw += cardPoints(card, "TA");
  const jacks = hand.filter((c) => c.rank === "J").length;
  const nines = hand.filter((c) => c.rank === "9").length;
  return Math.round(raw * (162 / 214)) + jacks * 5 + nines * 3;
}

/** Sans atout potential: aces and tens carry the hand, no cutting. */
function sansAtoutPotential(hand: Card[]): number {
  let points = 0;
  for (const card of hand) points += cardPoints(card, "SA");
  const aces = hand.filter((c) => c.rank === "A").length;
  const tens = hand.filter((c) => c.rank === "10").length;
  return points + aces * 4 + tens * 2;
}

function chooseBidAction(view: PlayerView): BotAction {
  const allowed = view.bidOptions?.suits ?? [];
  let best: { mode: TrumpMode; points: number } = { mode: "H", points: -1 };
  for (const suit of SUITS) {
    const points = trumpPotential(view.myHand, suit);
    if (points > best.points) best = { mode: suit, points };
  }
  if (allowed.includes("TA")) {
    const ta = toutAtoutPotential(view.myHand);
    if (ta > best.points) best = { mode: "TA", points: ta };
  }
  if (allowed.includes("SA")) {
    const sa = sansAtoutPotential(view.myHand);
    if (sa > best.points) best = { mode: "SA", points: sa };
  }
  const value = Math.min(MAX_BID, Math.round(best.points / 10) * 10);
  if (best.points >= MIN_BID && value > highestBid(view.bids)) {
    return { action: "BID", value, suit: best.mode };
  }
  return { action: "PASS" };
}

function choosePlayAction(view: PlayerView, options: BotOptions): BotAction {
  if (!view.contract) throw new Error("missing_contract");
  const legal = view.legalCards;
  if (legal.length === 0) throw new Error("no_legal_cards");
  if (legal.length === 1) return { action: "PLAY", card: legal[0] };

  const rng = options.rng ?? Math.random;
  const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const stats: RootStat[] = legal.map(() => ({ wins: 0, visits: 0 }));
  const determinizer = buildDeterminizer(view, rng);
  const attacking = teamOf(view.mySeat) === view.contract.team;

  const start = performance.now();
  let iterations = 0;
  while (iterations < maxIterations && performance.now() - start < timeBudgetMs) {
    const index = selectRootIndex(stats, iterations);
    const made = simulateRootMove(determinizer.next(), legal[index], rng);
    stats[index].visits += 1;
    if (made === attacking) stats[index].wins += 1;
    iterations += 1;
  }
  return { action: "PLAY", card: legal[bestIndex(stats)] };
}

/** UCB1 selection, trying each root move once before exploiting. */
function selectRootIndex(stats: RootStat[], totalIterations: number): number {
  for (let i = 0; i < stats.length; i++) {
    if (stats[i].visits === 0) return i;
  }
  const logN = Math.log(totalIterations + 1);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < stats.length; i++) {
    const mean = stats[i].wins / stats[i].visits;
    const score = mean + UCB_C * Math.sqrt(logN / stats[i].visits);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Root move with the highest observed win rate across determinizations. */
function bestIndex(stats: RootStat[]): number {
  let best = 0;
  let bestRate = -Infinity;
  for (let i = 0; i < stats.length; i++) {
    const rate = stats[i].visits === 0 ? -Infinity : stats[i].wins / stats[i].visits;
    if (rate > bestRate) {
      bestRate = rate;
      best = i;
    }
  }
  return best;
}
