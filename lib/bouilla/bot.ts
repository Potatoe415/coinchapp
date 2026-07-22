import { buildDeck, cardId, cardStrength, isClub, isKingOfSpades, isQueen } from "./cards";
import { submitPlay } from "./engine";
import { redact, type PlayerView } from "./redact";
import { CLUBS_PER_DECK, QUEENS_PER_DECK, TRICKS_PER_ROUND, sweepAliveFor, trickMattersForSweep } from "./rounds";
import type { Card, GameState, PlayedCard, Round, Seat, Suit, Trick } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];

/** Relative weights matching the real penalty ratio (50 / 20 / 10 points): the
 *  king of spades is worth 5x a club, a queen 2x a club, at baseline. */
const KING_OF_SPADES_WEIGHT = 5;
const QUEEN_WEIGHT = 2;
const CLUB_WEIGHT = 1;

/** How costly it would be to win a trick holding this card, for the active round.
 *  "everything" inherits every rule at once, so all weights apply together.
 *  Queens/clubs get scaled up as fewer copies remain unseen (`publicCards`, every
 *  card already played this round): the last one left is riskier to be caught
 *  holding than one of several, since there are fewer tricks left to safely dump
 *  it into. King of spades has only one copy, so it never needs scaling. */
function cardDanger(card: Card, round: Round, publicCards: Card[]): number {
  let danger = 0;
  if (round === "kingSpades" || round === "everything") {
    if (isKingOfSpades(card)) danger += KING_OF_SPADES_WEIGHT;
  }
  if (round === "queens" || round === "everything") {
    if (isQueen(card)) danger += QUEEN_WEIGHT * dangerScale(QUEENS_PER_DECK, publicCards.filter(isQueen).length);
  }
  if (round === "clubs" || round === "everything") {
    if (isClub(card)) danger += CLUB_WEIGHT * dangerScale(CLUBS_PER_DECK, publicCards.filter(isClub).length);
  }
  if (round === "lastTrick" || round === "everything") {
    danger += lastTrickDanger(card, publicCards);
  }
  return danger;
}

/** 1x when none of this card type have fallen yet, ramping up to `total`x once
 *  only one copy remains unseen. */
function dangerScale(total: number, fallen: number): number {
  const remaining = Math.max(1, total - fallen);
  return total / remaining;
}

/** Last N tricks of the round where holding a control card (Q/K/A) becomes a real
 *  liability: one of these is the card most likely to still be stuck in hand when
 *  the actual last trick comes around, this round's single biggest penalty
 *  (100 pts). Zero outside this window, so it doesn't crowd out the void-suit lead
 *  preference (`chooseLead`) during normal play, only in the run-up to the end. */
const LATE_ROUND_WINDOW = 4;

function isControlCard(card: Card): boolean {
  return card.rank === "Q" || card.rank === "K" || card.rank === "A";
}

function lastTrickDanger(card: Card, publicCards: Card[]): number {
  if (!isControlCard(card)) return 0;
  const tricksPlayedSoFar = Math.floor(publicCards.length / 4);
  const tricksRemaining = TRICKS_PER_ROUND - tricksPlayedSoFar;
  if (tricksRemaining > LATE_ROUND_WINDOW) return 0;
  return LATE_ROUND_WINDOW - tricksRemaining + 1;
}

function byLeastDanger(round: Round, publicCards: Card[]): (a: Card, b: Card) => number {
  return (a, b) => cardDanger(a, round, publicCards) - cardDanger(b, round, publicCards) || cardStrength(a) - cardStrength(b);
}

function byMostDanger(round: Round, publicCards: Card[]): (a: Card, b: Card) => number {
  return (a, b) => cardDanger(b, round, publicCards) - cardDanger(a, round, publicCards) || cardStrength(b) - cardStrength(a);
}

/** Deck cards neither in `myHand` nor already played (`publicCards`): every card
 *  that could still be sitting in an opponent's hand. */
function unseenCards(myHand: Card[], publicCards: Card[]): Card[] {
  const seen = new Set([...myHand, ...publicCards].map(cardId));
  return buildDeck().filter((c) => !seen.has(cardId(c)));
}

/** True if leading `card` is a guaranteed win: no unseen card of its suit could beat
 *  it. This defeats the entire premise behind `chooseLead`'s "lead our least dangerous
 *  card, so we are unlikely to win it" strategy below - the leader captures the trick
 *  outright, and every void opponent (see the void-count preference below) can then
 *  safely dump its own dangerous cards straight into a trick we cannot help but win
 *  (e.g. leading a bare Ace while holding no lower card of that suit, only for a
 *  void-forced opponent to drop the king of spades into it). Penalized as heavily as
 *  the round's single biggest flat risk, so it is never mistaken for "safe" purely for
 *  lacking a tracked point value of its own. */
function unbeatableLeadRisk(card: Card, unseen: Card[]): number {
  const beatable = unseen.some((c) => c.suit === card.suit && cardStrength(c) > cardStrength(card));
  return beatable ? 0 : KING_OF_SPADES_WEIGHT;
}

/** Suits each seat can no longer hold, inferred from completed tricks: whenever a
 *  seat didn't follow the led suit, it was void in it then and stays void in it for
 *  the rest of the round (public information every player can also work out). */
function inferVoids(tricks: Trick[]): Record<Seat, Set<Suit>> {
  const voids: Record<Seat, Set<Suit>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
  for (const trick of tricks) {
    const led = trick.cards[0]?.card.suit;
    if (!led) continue;
    for (const played of trick.cards) {
      if (played.card.suit !== led) voids[played.seat].add(led);
    }
  }
  return voids;
}

/** Leading a trick when not pushing for a sweep: play the safest card (lowest
 *  danger, then most opponents void in its suit, then lowest rank). Preferring a
 *  suit more opponents are void in invites them to dump their own dangerous cards
 *  freely into this trick - safe to bait since we just picked our least dangerous
 *  card, so we're unlikely to be the one who ends up winning it. */
function chooseLead(
  legal: Card[],
  round: Round,
  publicCards: Card[],
  voids: Record<Seat, Set<Suit>>,
  mySeat: Seat,
  opponentSweeping: boolean,
): Card {
  if (opponentSweeping && (round === "clubs" || round === "queens")) {
    const counted = legal.filter((c) => (round === "clubs" ? isClub(c) : isQueen(c)));
    if (counted.length > 0) return chooseLeadToWin(counted);
  }
  const unseen = unseenCards(legal, publicCards);
  const leadDanger = (c: Card) => cardDanger(c, round, publicCards) + unbeatableLeadRisk(c, unseen);
  const voidCount = (suit: Suit) => SEATS.filter((s) => s !== mySeat && voids[s].has(suit)).length;
  return [...legal].sort((a, b) => {
    const dangerDiff = leadDanger(a) - leadDanger(b);
    if (dangerDiff !== 0) return dangerDiff;
    const voidDiff = voidCount(b.suit) - voidCount(a.suit);
    if (voidDiff !== 0) return voidDiff;
    return cardStrength(a) - cardStrength(b);
  })[0];
}

/** Following: duck under the current best card of the led suit whenever a legal card
 *  allows it (guaranteed not to win), shedding the most dangerous safe card first. When
 *  forced to overtake (or discarding while void, which never wins), pick the choice that
 *  minimizes risk if it does end up winning the trick. */
function chooseFollow(legal: Card[], trick: PlayedCard[], round: Round, publicCards: Card[]): Card {
  const led = trick[0].card.suit;
  const followingSuit = legal.every((c) => c.suit === led);

  if (!followingSuit) {
    // Void in the led suit: this discard can never win the trick (no trump here).
    return [...legal].sort(byMostDanger(round, publicCards))[0];
  }

  const bestSoFar = Math.max(...trick.filter((p) => p.card.suit === led).map((p) => cardStrength(p.card)));
  const guaranteedLosers = legal.filter((c) => cardStrength(c) < bestSoFar);
  if (guaranteedLosers.length > 0) {
    return [...guaranteedLosers].sort(byMostDanger(round, publicCards))[0];
  }
  return [...legal].sort(byLeastDanger(round, publicCards))[0];
}

/** Lead the strongest card in hand: no trump, so simply the highest rank is most
 *  likely to hold up as the trick winner. Used to keep a sweep alive, or to grab a
 *  contested club/queen away from an opponent who is sweeping one. */
function chooseLeadToWin(legal: Card[]): Card {
  return [...legal].sort((a, b) => cardStrength(b) - cardStrength(a))[0];
}

/** Cheapest card that still beats the best led-suit card played so far, or null if
 *  nothing in hand can win this trick. */
function cheapestWinner(legal: Card[], bestSoFar: number): Card | null {
  const winners = legal.filter((c) => cardStrength(c) > bestSoFar);
  if (winners.length === 0) return null;
  return [...winners].sort((a, b) => cardStrength(a) - cardStrength(b))[0];
}

/** Following while trying to win the trick (own sweep alive, or breaking an
 *  opponent's): win as cheaply as possible, or fall back to the normal defensive
 *  play if nothing in hand can actually take it. */
function chooseFollowToWin(legal: Card[], trick: PlayedCard[], round: Round, publicCards: Card[]): Card {
  const led = trick[0].card.suit;
  if (legal.every((c) => c.suit === led)) {
    const bestSoFar = Math.max(...trick.filter((p) => p.card.suit === led).map((p) => cardStrength(p.card)));
    const winner = cheapestWinner(legal, bestSoFar);
    if (winner) return winner;
  }
  return chooseFollow(legal, trick, round, publicCards);
}

/** Heuristic bot: no search, just "avoid winning the dangerous trick" rules of
 *  thumb - except when pushing for (or breaking) a "Capot" sweep, where winning
 *  the trick is the whole point (see `sweepAliveFor`/`trickMattersForSweep`). */
export function chooseCard(view: PlayerView): Card {
  const legal = view.legalCards;
  if (legal.length === 0) throw new Error("no_legal_cards");
  if (legal.length === 1) return legal[0];

  const { round, tricks, currentTrick, mySeat } = view;
  const trick = currentTrick.cards;
  const publicCards = [...tricks.flatMap((t) => t.cards), ...trick].map((p) => p.card);

  const mySweepAlive = sweepAliveFor(mySeat, round, tricks);
  const opponentSweeping = !mySweepAlive && SEATS.some((s) => s !== mySeat && sweepAliveFor(s, round, tricks));
  // For "tricks"/"everything" every trick counts, so an opponent's streak needs
  // breaking whether we're leading or following it. For "clubs"/"queens", an empty
  // `trick` can't tell yet whether this trick will matter - `chooseLead` handles
  // that lead-time case separately, by grabbing a held club/queen outright.
  const tryToWin = mySweepAlive || (opponentSweeping && trickMattersForSweep(round, trick));

  if (trick.length === 0) {
    if (tryToWin) return chooseLeadToWin(legal);
    return chooseLead(legal, round, publicCards, inferVoids(tricks), mySeat, opponentSweeping);
  }
  if (tryToWin) return chooseFollowToWin(legal, trick, round, publicCards);
  return chooseFollow(legal, trick, round, publicCards);
}

/** Auto-play bot seats until it is a human's turn or the round ends. */
export function advanceBots(state: GameState, isBot: boolean[]): GameState {
  let current = state;
  let guard = 0;
  while (guard++ < 200) {
    if (current.phase !== "playing" || !isBot[current.turn]) break;
    const seat = current.turn as Seat;
    current = submitPlay(current, seat, chooseCard(redact(current, seat)));
  }
  return current;
}
