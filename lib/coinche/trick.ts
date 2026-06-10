import { cardStrength, nextSeat, sameCard, teamOf, trumpStrength } from "./cards";
import type { Card, GameState, PlayedCard, Seat, Suit, Trick, TrumpMode } from "./types";

/** Seat currently winning the given (partial) trick. */
export function trickWinner(cards: PlayedCard[], trump: TrumpMode | null): Seat {
  const led = cards[0].card.suit;
  let best = cards[0];
  for (const played of cards) {
    if (
      cardStrength(played.card, led, trump) > cardStrength(best.card, led, trump)
    ) {
      best = played;
    }
  }
  return best.seat;
}

function highestTrumpStrength(cards: PlayedCard[], trump: TrumpMode | null): number {
  let max = -1;
  for (const played of cards) {
    if (trump && trump !== "SA" && trump !== "TA" && played.card.suit === trump) {
      max = Math.max(max, trumpStrength(played.card));
    }
  }
  return max;
}

/** Highest trump-order strength among trick cards of the given suit (used in TA). */
function highestStrengthInSuit(cards: PlayedCard[], suit: Suit): number {
  let max = -1;
  for (const played of cards) {
    if (played.card.suit === suit) max = Math.max(max, trumpStrength(played.card));
  }
  return max;
}

/** Cards the seat is allowed to play, per Coinche following/cutting rules. */
export function legalCards(state: GameState, seat: Seat): Card[] {
  const hand = state.hands[seat];
  const trick = state.currentTrick.cards;
  const trump = state.trump;
  if (trick.length === 0) return [...hand];

  const led = trick[0].card.suit;

  // Sans atout: follow the led suit if possible, otherwise play anything. No cutting.
  if (trump === "SA") {
    const ledCards = hand.filter((c) => c.suit === led);
    return ledCards.length > 0 ? ledCards : [...hand];
  }

  // Tout atout: each suit is its own trump line. Must follow and overtake within the
  // led suit; if void, play anything (another suit can never win the trick).
  if (trump === "TA") {
    const ledCards = hand.filter((c) => c.suit === led);
    if (ledCards.length === 0) return [...hand];
    const top = highestStrengthInSuit(trick, led);
    const higher = ledCards.filter((c) => trumpStrength(c) > top);
    return higher.length > 0 ? higher : ledCards;
  }

  const myTrumps = trump ? hand.filter((c) => c.suit === trump) : [];
  const topTrump = highestTrumpStrength(trick, trump);
  const partnerMaster = teamOf(trickWinner(trick, trump)) === teamOf(seat);

  if (trump && led === trump) {
    if (myTrumps.length === 0) return [...hand];
    const higher = myTrumps.filter((c) => trumpStrength(c) > topTrump);
    return higher.length > 0 ? higher : myTrumps;
  }

  const ledCards = hand.filter((c) => c.suit === led);
  if (ledCards.length > 0) return ledCards;

  if (partnerMaster) return [...hand];
  if (myTrumps.length > 0) {
    const higher = myTrumps.filter((c) => trumpStrength(c) > topTrump);
    return higher.length > 0 ? higher : myTrumps;
  }
  return [...hand];
}

export function isLegalPlay(state: GameState, seat: Seat, card: Card): boolean {
  return legalCards(state, seat).some((c) => sameCard(c, card));
}

/** Apply a card play. Resolves the trick when complete and advances the turn. */
export function applyPlay(state: GameState, seat: Seat, card: Card): GameState {
  if (state.phase !== "playing") throw new Error("not_playing");
  if (state.turn !== seat) throw new Error("not_your_turn");
  if (!state.hands[seat].some((c) => sameCard(c, card))) {
    throw new Error("card_not_in_hand");
  }
  if (!isLegalPlay(state, seat, card)) throw new Error("illegal_card");

  const hands = state.hands.map((h, i) =>
    i === seat ? h.filter((c) => !sameCard(c, card)) : h,
  );
  const trickCards: PlayedCard[] = [...state.currentTrick.cards, { seat, card }];

  if (trickCards.length < 4) {
    return {
      ...state,
      hands,
      currentTrick: { ...state.currentTrick, cards: trickCards },
      turn: nextSeat(seat),
    };
  }

  const winner = trickWinner(trickCards, state.trump);
  const completed: Trick = {
    leader: state.currentTrick.leader,
    cards: trickCards,
    winner,
  };
  const tricks = [...state.tricks, completed];
  const done = tricks.length === 8;
  return {
    ...state,
    hands,
    tricks,
    currentTrick: { leader: winner, cards: [] },
    turn: winner,
    phase: done ? "scoring" : "playing",
  };
}
