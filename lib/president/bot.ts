import { rankValue } from "./cards";
import { submitExchangeReturn, submitPass, submitPlay } from "./engine";
import { redact, type PlayerView } from "./redact";
import type { Card, Combo, GameState, Seat } from "./types";

export type PresidentBotAction =
  | { action: "COMBO"; combo: Combo }
  | { action: "PASS" }
  | { action: "EXCHANGE_RETURN"; cards: Card[] };

/** Give back the lowest-ranked cards owed - keeps the strongest cards for the
 *  round ahead. */
function chooseReturnCards(view: PlayerView): Card[] {
  const owed = view.pendingExchange?.owed[view.mySeat] ?? 0;
  return [...view.myHand].sort((a, b) => rankValue(a.rank, false) - rankValue(b.rank, false)).slice(0, owed);
}

/** Smallest count, then weakest rank, combo that legally beats the pile (or
 *  opens a free one): conserves bigger sets - especially quads, worth saving
 *  for a future revolution - for later. No search, just this rule of thumb,
 *  same cost/benefit call already made for Bouilla's bot. */
function chooseCombo(view: PlayerView): Combo {
  return [...view.legalCombos].sort(
    (a, b) => a.cards.length - b.cards.length || rankValue(a.rank, view.revolution) - rankValue(b.rank, view.revolution),
  )[0];
}

/** Heuristic bot: never passes voluntarily (always plays a legal combo if one
 *  exists), decisive and cheap. */
export function chooseAction(view: PlayerView): PresidentBotAction {
  if (view.phase === "exchange") return { action: "EXCHANGE_RETURN", cards: chooseReturnCards(view) };
  if (view.legalCombos.length > 0) return { action: "COMBO", combo: chooseCombo(view) };
  if (!view.canPass) throw new Error("no_legal_action");
  return { action: "PASS" };
}

function applyBotAction(state: GameState, seat: Seat, action: PresidentBotAction): GameState {
  if (action.action === "PASS") return submitPass(state, seat);
  if (action.action === "COMBO") return submitPlay(state, seat, action.combo);
  return submitExchangeReturn(state, seat, action.cards);
}

/** Auto-play bot seats (through the exchange phase too) until it is a human's
 *  turn or the round ends. */
export function advanceBots(state: GameState, isBot: boolean[]): GameState {
  let current = state;
  let guard = 0;
  while (guard++ < 500) {
    const seat = current.phase === "exchange" ? current.pendingExchange?.awaiting[0] : current.turn;
    const isActive = current.phase === "playing" || current.phase === "exchange";
    if (seat === undefined || !isActive || !isBot[seat]) break;
    current = applyBotAction(current, seat, chooseAction(redact(current, seat as Seat)));
  }
  return current;
}
