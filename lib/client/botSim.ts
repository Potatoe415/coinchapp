import { buildDeck, cardId, DEFAULT_SCORING_RULES, legalCards, submitPlay, teamOf } from "@/lib/coinche";
import type { Card, GameState, PlayerView, Seat, Suit, Team, Trick, TrumpMode } from "@/lib/coinche";

/** Upper bound on plays in a single rollout (8 tricks * 4 seats). */
const MAX_PLAYS = 32;

/** Card ids already visible to the bot: completed tricks plus the current trick. */
function playedIds(view: PlayerView): Set<string> {
  const ids = new Set<string>();
  for (const trick of view.tricks) {
    for (const played of trick.cards) ids.add(cardId(played.card));
  }
  for (const played of view.currentTrick.cards) ids.add(cardId(played.card));
  return ids;
}

/** Cards neither in the bot's hand nor yet played: the opponents' unknown pool. */
function unseenPool(view: PlayerView): Card[] {
  const seen = playedIds(view);
  for (const card of view.myHand) seen.add(cardId(card));
  return buildDeck().filter((card) => !seen.has(cardId(card)));
}

/** In-place Fisher-Yates to avoid per-iteration array allocations. */
function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
}

function seatHolding(hands: Card[][], tricks: Trick[], suit: Suit, rank: string): number {
  for (let seat = 0; seat < 4; seat++) {
    if (hands[seat].some((c) => c.suit === suit && c.rank === rank)) return seat;
  }
  for (const trick of tricks) {
    for (const played of trick.cards) {
      if (played.card.suit === suit && played.card.rank === rank) return played.seat;
    }
  }
  return -1;
}

/** Belote per team (K+Q of a suit), scanning hands and played tricks. Mode-aware. */
function locateBelote(
  hands: Card[][],
  tricks: Trick[],
  trump: TrumpMode | null,
): { team: Team | null; points: { A: number; B: number } } {
  const points = { A: 0, B: 0 };
  if (trump === null || trump === "SA") return { team: null, points };
  const suits: Suit[] = trump === "TA" ? ["H", "D", "C", "S"] : [trump];
  let team: Team | null = null;
  for (const suit of suits) {
    const kingSeat = seatHolding(hands, tricks, suit, "K");
    const queenSeat = seatHolding(hands, tricks, suit, "Q");
    if (kingSeat >= 0 && kingSeat === queenSeat) {
      const holder = teamOf(kingSeat as Seat);
      points[holder] += 20;
      if (trump !== "TA") team = holder;
    }
  }
  return { team, points };
}

function baseTemplate(view: PlayerView): GameState {
  return {
    phase: "playing",
    dealer: view.dealer,
    turn: view.turn,
    trump: view.trump,
    contract: view.contract,
    bids: view.bids,
    hands: [[], [], [], []],
    currentTrick: view.currentTrick,
    tricks: view.tricks,
    belote: { team: null, points: { A: 0, B: 0 }, announced: [] },
    scores: view.scores,
    targetPoints: view.targetPoints,
    scoringRules: DEFAULT_SCORING_RULES,
  };
}

export interface Determinizer {
  /** A fresh, randomly dealt world consistent with the bot's information set. */
  next(): GameState;
}

/** Builds a reusable determinizer; shared, read-only structures are never mutated. */
export function buildDeterminizer(view: PlayerView, rng: () => number): Determinizer {
  if (!view.contract) throw new Error("missing_contract");
  const pool = unseenPool(view);
  const mySeat = view.mySeat;
  const others = ([0, 1, 2, 3] as Seat[]).filter((s) => s !== mySeat);
  const counts = others.map((s) => view.handCounts[s]);
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total !== pool.length) throw new Error("determinization_mismatch");
  const template = baseTemplate(view);

  return {
    next(): GameState {
      shuffleInPlace(pool, rng);
      const hands: Card[][] = [[], [], [], []];
      hands[mySeat] = view.myHand.slice();
      let cursor = 0;
      others.forEach((seat, i) => {
        hands[seat] = pool.slice(cursor, cursor + counts[i]);
        cursor += counts[i];
      });
      const located = locateBelote(hands, view.tricks, view.trump);
      const belote = { ...located, announced: [] as ("belote" | "rebelote")[] };
      return { ...template, hands, belote };
    },
  };
}

/** Play the root card, then random legal moves to the deal end. Returns contractMade. */
export function simulateRootMove(state: GameState, card: Card, rng: () => number): boolean {
  let current = submitPlay(state, state.turn, card);
  let guard = 0;
  while (current.phase === "playing" && guard++ < MAX_PLAYS) {
    const legal = legalCards(current, current.turn);
    current = submitPlay(current, current.turn, legal[Math.floor(rng() * legal.length)]);
  }
  if (!current.lastDeal) throw new Error("incomplete_simulation");
  return current.lastDeal.contractMade;
}
