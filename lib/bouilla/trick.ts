import { nextSeat } from "@/lib/cards";
import { cardStrength, isKingOfSpades, sameCard } from "./cards";
import { ROUND_ORDER } from "./types";
import type { Card, GameState, PlayedCard, Seat, Trick } from "./types";

/** Seat currently winning the given (partial) trick. No trump: only led-suit cards can win. */
export function trickWinner(cards: PlayedCard[]): Seat {
  const led = cards[0].card.suit;
  let best = cards[0];
  for (const played of cards) {
    if (played.card.suit === led && cardStrength(played.card) > cardStrength(best.card)) {
      best = played;
    }
  }
  return best.seat;
}

/** Cards the seat is allowed to play: follow the led suit if possible, else anything. */
export function legalCards(state: GameState, seat: Seat): Card[] {
  const hand = state.hands[seat];
  const trick = state.currentTrick.cards;
  if (trick.length === 0) return [...hand];
  const led = trick[0].card.suit;
  const ledCards = hand.filter((c) => c.suit === led);
  return ledCards.length > 0 ? ledCards : [...hand];
}

export function isLegalPlay(state: GameState, seat: Seat, card: Card): boolean {
  return legalCards(state, seat).some((c) => sameCard(c, card));
}

/** Apply a card play. Resolves the trick when complete and advances the turn.
 *  A round normally ends after 13 tricks (the full 52-card pack, 13 cards per
 *  seat) - except "kingSpades", which ends the instant the king of spades is
 *  captured, since nothing else in that round can still change the score. */
export function applyPlay(state: GameState, seat: Seat, card: Card): GameState {
  if (state.phase !== "playing") throw new Error("not_playing");
  if (state.turn !== seat) throw new Error("not_your_turn");
  if (!state.hands[seat].some((c) => sameCard(c, card))) {
    throw new Error("card_not_in_hand");
  }
  if (!isLegalPlay(state, seat, card)) throw new Error("illegal_card");

  const hands = state.hands.map((h, i) => (i === seat ? h.filter((c) => !sameCard(c, card)) : h));
  const trickCards: PlayedCard[] = [...state.currentTrick.cards, { seat, card }];

  if (trickCards.length < 4) {
    return {
      ...state,
      hands,
      currentTrick: { ...state.currentTrick, cards: trickCards },
      turn: nextSeat(seat),
    };
  }

  const winner = trickWinner(trickCards);
  const completed: Trick = { leader: state.currentTrick.leader, cards: trickCards, winner };
  const tricks = [...state.tricks, completed];
  const kingOfSpadesFell = ROUND_ORDER[state.roundIndex] === "kingSpades" && completed.cards.some((p) => isKingOfSpades(p.card));
  const done = tricks.length === 13 || kingOfSpadesFell;
  return {
    ...state,
    hands,
    tricks,
    currentTrick: { leader: winner, cards: [] },
    turn: winner,
    phase: done ? "scoring" : "playing",
  };
}
