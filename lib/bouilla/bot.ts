import { cardStrength, isClub, isKingOfSpades, isQueen } from "./cards";
import { submitPlay } from "./engine";
import { redact, type PlayerView } from "./redact";
import { CLUBS_PER_DECK, QUEENS_PER_DECK, sweepAliveFor, trickMattersForSweep } from "./rounds";
import type { Card, GameState, PlayedCard, Round, Seat, Suit, Trick } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];

/** How costly it would be to win a trick holding this card, for the active round.
 *  "everything" inherits every rule at once, so all three weights apply together.
 *  Queens/clubs get scaled up as fewer copies remain unseen (`publicCards`, every
 *  card already played this round): the last one left is riskier to be caught
 *  holding than one of several, since there are fewer tricks left to safely dump
 *  it into. King of spades has only one copy, so it never needs scaling. */
function cardDanger(card: Card, round: Round, publicCards: Card[]): number {
  let danger = 0;
  if (round === "kingSpades" || round === "everything") {
    if (isKingOfSpades(card)) danger += 3;
  }
  if (round === "queens" || round === "everything") {
    if (isQueen(card)) danger += 2 * dangerScale(QUEENS_PER_DECK, publicCards.filter(isQueen).length);
  }
  if (round === "clubs" || round === "everything") {
    if (isClub(card)) danger += 1 * dangerScale(CLUBS_PER_DECK, publicCards.filter(isClub).length);
  }
  return danger;
}

/** 1x when none of this card type have fallen yet, ramping up to `total`x once
 *  only one copy remains unseen. */
function dangerScale(total: number, fallen: number): number {
  const remaining = Math.max(1, total - fallen);
  return total / remaining;
}

function byLeastDanger(round: Round, publicCards: Card[]): (a: Card, b: Card) => number {
  return (a, b) => cardDanger(a, round, publicCards) - cardDanger(b, round, publicCards) || cardStrength(a) - cardStrength(b);
}

function byMostDanger(round: Round, publicCards: Card[]): (a: Card, b: Card) => number {
  return (a, b) => cardDanger(b, round, publicCards) - cardDanger(a, round, publicCards) || cardStrength(b) - cardStrength(a);
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
  const voidCount = (suit: Suit) => SEATS.filter((s) => s !== mySeat && voids[s].has(suit)).length;
  return [...legal].sort((a, b) => {
    const dangerDiff = cardDanger(a, round, publicCards) - cardDanger(b, round, publicCards);
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
