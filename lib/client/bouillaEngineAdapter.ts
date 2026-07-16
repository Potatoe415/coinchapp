import { chooseCard, redact, submitPlay, type Card, type GameState, type PlayerView, type Seat } from "@/lib/bouilla";
import type { BotLoopEngine } from "./cardGameDriver";

export type BouillaBotAction = { action: "PLAY"; card: Card };

export function applyBouillaBotAction(state: GameState, seat: Seat, action: BouillaBotAction): GameState {
  return submitPlay(state, seat, action.card);
}

/** Bouilla has no bidding phase and no worker: the heuristic bot is cheap enough to run
 *  synchronously, wrapped in a resolved promise to match the generic loop's `decide` signature. */
export function decideBouillaAction(view: PlayerView): Promise<BouillaBotAction> {
  return Promise.resolve({ action: "PLAY", card: chooseCard(view) });
}

/** Plugs the Bouilla rules engine into the generic bot-advance loop (see cardGameDriver.ts). */
export const bouillaEngine: BotLoopEngine<GameState, PlayerView, BouillaBotAction> = {
  isBotTurn: (state, isBot) => state.phase === "playing" && isBot(state.turn),
  currentTurn: (state) => state.turn,
  redact: (state, seat) => redact(state, seat as Seat),
  applyBotAction: (state, seat, action) => applyBouillaBotAction(state, seat as Seat, action),
  didCollectTrick: (prev, next) => next.tricks.length > prev.tricks.length,
};
