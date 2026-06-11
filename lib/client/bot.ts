import { decideBidWithSupport, PUNCH_CONTRIBUTION, teamOf } from "@/lib/coinche";
import type { BotPunch, Card, PlayerView, TrumpMode } from "@/lib/coinche";
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
  /** Bidding aggressiveness; defaults to the heuristic's "med" level. */
  punch?: BotPunch;
}

const DEFAULT_TIME_BUDGET_MS = 800;
const DEFAULT_MAX_ITERATIONS = 2000;
const UCB_C = Math.SQRT2;

interface RootStat {
  wins: number;
  visits: number;
}

export function chooseClientAction(view: PlayerView, options: BotOptions = {}): BotAction {
  if (view.turn !== view.mySeat) throw new Error("not_your_turn");
  if (view.phase === "bidding") return chooseBidAction(view, options);
  if (view.phase === "playing") return choosePlayAction(view, options);
  throw new Error("no_action_available");
}

function chooseBidAction(view: PlayerView, options: BotOptions): BotAction {
  const bid = view.bidOptions;
  const contribution = options.punch ? PUNCH_CONTRIBUTION[options.punch] : undefined;
  const decision = decideBidWithSupport(
    view.myHand,
    view.bids,
    view.mySeat,
    bid?.suits ?? [],
    bid?.minValue ?? null,
    contribution,
  );
  if (decision.shouldBid) {
    return { action: "BID", value: decision.value, suit: decision.mode };
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
