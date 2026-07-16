import { cardStrength, isClub, isKingOfSpades, isQueen } from "./cards";
import { submitPlay } from "./engine";
import { redact, type PlayerView } from "./redact";
import type { Card, GameState, PlayedCard, Round, Seat } from "./types";

/** How costly it would be to win a trick holding this card, for the active round.
 *  "everything" inherits every rule at once, so all three weights apply together. */
function cardDanger(card: Card, round: Round): number {
  let danger = 0;
  if (round === "kingSpades" || round === "everything") {
    if (isKingOfSpades(card)) danger += 3;
  }
  if (round === "queens" || round === "everything") {
    if (isQueen(card)) danger += 2;
  }
  if (round === "clubs" || round === "everything") {
    if (isClub(card)) danger += 1;
  }
  return danger;
}

function byLeastDanger(round: Round): (a: Card, b: Card) => number {
  return (a, b) => cardDanger(a, round) - cardDanger(b, round) || cardStrength(a) - cardStrength(b);
}

function byMostDanger(round: Round): (a: Card, b: Card) => number {
  return (a, b) => cardDanger(b, round) - cardDanger(a, round) || cardStrength(b) - cardStrength(a);
}

/** Leading a trick: play the safest card (lowest danger, then lowest rank) since a low
 *  lead is the least likely to come back around and win. */
function chooseLead(legal: Card[], round: Round): Card {
  return [...legal].sort(byLeastDanger(round))[0];
}

/** Following: duck under the current best card of the led suit whenever a legal card
 *  allows it (guaranteed not to win), shedding the most dangerous safe card first. When
 *  forced to overtake (or discarding while void, which never wins), pick the choice that
 *  minimizes risk if it does end up winning the trick. */
function chooseFollow(legal: Card[], trick: PlayedCard[], round: Round): Card {
  const led = trick[0].card.suit;
  const followingSuit = legal.every((c) => c.suit === led);

  if (!followingSuit) {
    // Void in the led suit: this discard can never win the trick (no trump here).
    return [...legal].sort(byMostDanger(round))[0];
  }

  const bestSoFar = Math.max(...trick.filter((p) => p.card.suit === led).map((p) => cardStrength(p.card)));
  const guaranteedLosers = legal.filter((c) => cardStrength(c) < bestSoFar);
  if (guaranteedLosers.length > 0) {
    return [...guaranteedLosers].sort(byMostDanger(round))[0];
  }
  return [...legal].sort(byLeastDanger(round))[0];
}

/** Simple heuristic bot: no search, just "avoid winning the dangerous trick" rules of thumb. */
export function chooseCard(view: PlayerView): Card {
  const legal = view.legalCards;
  if (legal.length === 0) throw new Error("no_legal_cards");
  if (legal.length === 1) return legal[0];
  const trick = view.currentTrick.cards;
  return trick.length === 0 ? chooseLead(legal, view.round) : chooseFollow(legal, trick, view.round);
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
