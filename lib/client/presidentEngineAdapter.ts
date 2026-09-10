import {
  chooseAction,
  redact,
  submitExchangeReturn,
  submitPass,
  submitPlay,
  type GameState,
  type PlayerView,
  type PresidentBotAction,
  type Seat,
} from "@/lib/president";
import type { BotLoopEngine } from "./cardGameDriver";

export function applyPresidentBotAction(state: GameState, seat: Seat, action: PresidentBotAction): GameState {
  if (action.action === "PASS") return submitPass(state, seat);
  if (action.action === "COMBO") return submitPlay(state, seat, action.combo);
  return submitExchangeReturn(state, seat, action.cards);
}

/** No search, cheap enough to run synchronously - wrapped in a resolved promise
 *  to match the generic loop's `decide` signature (same call as Bouilla's bot). */
export function decidePresidentAction(view: PlayerView): Promise<PresidentBotAction> {
  return Promise.resolve(chooseAction(view));
}

function turnFor(state: GameState): Seat {
  return state.phase === "exchange" ? state.pendingExchange!.awaiting[0] : state.turn;
}

/** Plugs the Président rules engine into the generic bot-advance loop (see
 *  cardGameDriver.ts) - covering both the "playing" phase and the "exchange"
 *  phase's sequential returns. */
export const presidentEngine: BotLoopEngine<GameState, PlayerView, PresidentBotAction> = {
  isBotTurn: (state, isBot) => {
    if (state.phase !== "playing" && state.phase !== "exchange") return false;
    return isBot(turnFor(state));
  },
  currentTurn: turnFor,
  redact: (state, seat) => redact(state, seat as Seat),
  applyBotAction: (state, seat, action) => applyPresidentBotAction(state, seat as Seat, action),
  // No "trick" concept: pause instead once a seat empties its hand, so the
  // player has a moment to notice before bots keep racing to the finish.
  didCollectTrick: (prev, next) => next.finishedOrder.length > prev.finishedOrder.length,
};
