import { redact, type GameState, type PlayerView, type Seat } from "@/lib/coinche";
import type { BotLoopEngine } from "./cardGameDriver";
import type { BotAction } from "./bot";
import { applyBotAction } from "./p2p/hostEngine";

/** Plugs the Coinche rules engine into the generic bot-advance loop (see cardGameDriver.ts). */
export const coincheEngine: BotLoopEngine<GameState, PlayerView, BotAction> = {
  isBotTurn: (state, isBot) =>
    (state.phase === "bidding" || state.phase === "playing") && isBot(state.turn),
  currentTurn: (state) => state.turn,
  redact: (state, seat) => redact(state, seat as Seat),
  applyBotAction: (state, seat, action) => applyBotAction(state, seat as Seat, action),
  didCollectTrick: (prev, next) => next.tricks.length > prev.tricks.length,
};
