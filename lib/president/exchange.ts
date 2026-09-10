import { cardId, rankValue } from "./cards";
import type { Card, GameState, PendingExchange, Seat, Titles } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];

function seatWithTitle(titles: Titles, title: Titles[number]): Seat {
  return SEATS.find((s) => titles[s] === title)!;
}

/** Highest `count` cards in `hand` (by plain, non-revolution rank), plus the
 *  rest of the hand with them removed. */
function takeTopCards(hand: Card[], count: number): { taken: Card[]; remaining: Card[] } {
  const sorted = [...hand].sort((a, b) => rankValue(b.rank, false) - rankValue(a.rank, false));
  const taken = sorted.slice(0, count);
  const takenIds = new Set(taken.map(cardId));
  return { taken, remaining: hand.filter((c) => !takenIds.has(cardId(c))) };
}

export interface ForcedTransfer {
  from: Seat;
  to: Seat;
  cards: Card[];
}

/** The automatic, no-choice half of the exchange: the previous round's Trou du
 *  Cul's 2 highest cards move to the President, and the Vice-Trou du Cul's
 *  highest card moves to the Vice-President. Returns the updated hands plus
 *  `[presidentTransfer, vicePresidentTransfer]` (fixed order, always length 2). */
export function computeForcedTransfers(titles: Titles, hands: Card[][]): { hands: Card[][]; transfers: [ForcedTransfer, ForcedTransfer] } {
  const president = seatWithTitle(titles, "president");
  const vicePresident = seatWithTitle(titles, "vicePresident");
  const viceTrouDuCul = seatWithTitle(titles, "viceTrouDuCul");
  const trouDuCul = seatWithTitle(titles, "trouDuCul");
  const next = hands.map((h) => [...h]);

  const fromTdc = takeTopCards(next[trouDuCul], 2);
  next[trouDuCul] = fromTdc.remaining;
  next[president] = [...next[president], ...fromTdc.taken];

  const fromVtdc = takeTopCards(next[viceTrouDuCul], 1);
  next[viceTrouDuCul] = fromVtdc.remaining;
  next[vicePresident] = [...next[vicePresident], ...fromVtdc.taken];

  return {
    hands: next,
    transfers: [
      { from: trouDuCul, to: president, cards: fromTdc.taken },
      { from: viceTrouDuCul, to: vicePresident, cards: fromVtdc.taken },
    ],
  };
}

/** The seat that must receive a given awaiting seat's return: the President
 *  returns to the Trou du Cul, the Vice-President to the Vice-Trou du Cul. */
function returnRecipient(titles: Titles, seat: Seat): Seat {
  const title = titles[seat];
  if (title === "president") return seatWithTitle(titles, "trouDuCul");
  if (title === "vicePresident") return seatWithTitle(titles, "viceTrouDuCul");
  throw new Error("not_exchanging_seat");
}

export function validateExchangeReturn(state: GameState, seat: Seat, cards: Card[]): boolean {
  if (state.phase !== "exchange" || !state.pendingExchange) return false;
  if (state.pendingExchange.awaiting[0] !== seat) return false;
  if (cards.length !== state.pendingExchange.owed[seat]) return false;
  const ids = new Set(cards.map(cardId));
  if (ids.size !== cards.length) return false;
  const handIds = new Set(state.hands[seat].map(cardId));
  return cards.every((c) => handIds.has(cardId(c)));
}

function nextExchangeStep(state: GameState, pending: PendingExchange): GameState {
  const awaiting = pending.awaiting.slice(1);
  if (awaiting.length > 0) {
    return { ...state, pendingExchange: { ...pending, awaiting }, turn: awaiting[0] };
  }
  // Both returns done: play resumes, led by the previous round's Trou du Cul.
  return {
    ...state,
    pendingExchange: null,
    phase: "playing",
    turn: seatWithTitle(state.titles!, "trouDuCul"),
    pile: { combo: null, leader: null },
    passStreak: 0,
    revolution: false,
    finishedOrder: [],
  };
}

export function applyExchangeReturn(state: GameState, seat: Seat, cards: Card[]): GameState {
  if (!validateExchangeReturn(state, seat, cards)) throw new Error("invalid_exchange_return");
  const recipient = returnRecipient(state.titles!, seat);
  const ids = new Set(cards.map(cardId));
  const hands = state.hands.map((h, i) => {
    if (i === seat) return h.filter((c) => !ids.has(cardId(c)));
    if (i === recipient) return [...h, ...cards];
    return h;
  });
  return nextExchangeStep({ ...state, hands }, state.pendingExchange!);
}
