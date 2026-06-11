import { buildDeck, cardId, DEFAULT_SCORING_RULES, legalCards, submitPlay, teamOf } from "@/lib/coinche";
import type {
  Card,
  GameState,
  PlayedCard,
  PlayerView,
  Seat,
  Suit,
  Team,
  Trick,
  TrumpMode,
} from "@/lib/coinche";

/** Upper bound on plays in a single rollout (8 tricks * 4 seats). */
const MAX_PLAYS = 32;

/** Constrained-deal attempts before falling back to an unconstrained shuffle. */
const MAX_DEAL_ATTEMPTS = 64;

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

/** Seat failed to follow the led suit in this trick => it is void in that suit. */
function scanVoids(cards: PlayedCard[], voids: Set<Suit>[]): void {
  if (cards.length === 0) return;
  const led = cards[0].card.suit;
  for (const played of cards) {
    if (played.card.suit !== led) voids[played.seat].add(led);
  }
}

/**
 * Known suit voids ("chicanes") per seat, deduced from public play: any seat
 * that did not follow the led suit cannot hold that suit. Holds in every mode
 * (single trump, tout atout, sans atout), since following the led suit is
 * always mandatory when possible.
 */
function inferVoids(view: PlayerView): Set<Suit>[] {
  const voids: Set<Suit>[] = [new Set(), new Set(), new Set(), new Set()];
  for (const trick of view.tricks) scanVoids(trick.cards, voids);
  scanVoids(view.currentTrick.cards, voids);
  return voids;
}

/** Pool ordered most-constrained first (fewest seats able to hold the card). */
function orderByConstraint(pool: Card[], seatVoids: Set<Suit>[]): Card[] {
  const eligible = (card: Card): number =>
    seatVoids.reduce((n, v) => n + (v.has(card.suit) ? 0 : 1), 0);
  return [...pool].sort((a, b) => eligible(a) - eligible(b));
}

/**
 * One randomized pass assigning each card to a seat that may hold its suit and
 * still has room. Returns null on a dead end (caller retries or falls back).
 */
function tryDeal(
  ordered: Card[],
  seatVoids: Set<Suit>[],
  counts: number[],
  rng: () => number,
): Card[][] | null {
  const cap = counts.slice();
  const hands: Card[][] = counts.map(() => []);
  for (const card of ordered) {
    const choices: number[] = [];
    for (let i = 0; i < hands.length; i++) {
      if (cap[i] > 0 && !seatVoids[i].has(card.suit)) choices.push(i);
    }
    if (choices.length === 0) return null;
    const pick = choices[Math.floor(rng() * choices.length)];
    hands[pick].push(card);
    cap[pick] -= 1;
  }
  return hands;
}

/** Plain shuffle-and-slice, ignoring voids: graceful last resort, never fails. */
function fallbackDeal(pool: Card[], counts: number[], rng: () => number): Card[][] {
  const copy = pool.slice();
  shuffleInPlace(copy, rng);
  const hands: Card[][] = [];
  let cursor = 0;
  for (const count of counts) {
    hands.push(copy.slice(cursor, cursor + count));
    cursor += count;
  }
  return hands;
}

/** A void-respecting deal of `ordered` into seats, with a safe unconstrained fallback. */
function dealConstrained(
  ordered: Card[],
  seatVoids: Set<Suit>[],
  counts: number[],
  rng: () => number,
): Card[][] {
  for (let attempt = 0; attempt < MAX_DEAL_ATTEMPTS; attempt++) {
    const dealt = tryDeal(ordered, seatVoids, counts, rng);
    if (dealt) return dealt;
  }
  return fallbackDeal(ordered, counts, rng);
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
  const seatVoids = others.map((s) => inferVoids(view)[s]);
  const ordered = orderByConstraint(pool, seatVoids);
  const template = baseTemplate(view);

  return {
    next(): GameState {
      const dealt = dealConstrained(ordered, seatVoids, counts, rng);
      const hands: Card[][] = [[], [], [], []];
      hands[mySeat] = view.myHand.slice();
      others.forEach((seat, i) => {
        hands[seat] = dealt[i];
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
