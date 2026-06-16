import {
  DEFAULT_SCORING_RULES,
  submitBid,
  submitPlay,
  type GameState,
  type ScoringRules,
  type Seat,
} from "@/lib/coinche";
import type { GameSettings } from "@/lib/supabase/types";
import type { GameView } from "@/lib/server/view";
import type { RosterEntry } from "./protocol";
import type { BotAction } from "../bot";

/** Deterministic RNG (mirrors useLocalGame; kept local to avoid touching solo mode). */
export function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Apply a bot's decided action (heuristic bid or ISMCTS card) to the state. */
export function applyBotAction(state: GameState, seat: Seat, action: BotAction): GameState {
  if (action.action === "PLAY") return submitPlay(state, seat, action.card);
  if (action.action === "BID") {
    return submitBid(state, { seat, type: "bid", value: action.value, suit: action.suit });
  }
  return submitBid(state, { seat, type: "pass" });
}

/** Attach the end-of-deal readiness gate to a seat view during the scoring phase. */
export function attachGate(
  gv: GameView,
  state: GameState,
  seat: number,
  roster: RosterEntry[],
  ready: Set<number>,
): GameView {
  if (state.phase !== "scoring") return gv;
  const humans = roster.filter((e) => !e.isBot).map((e) => e.seat);
  gv.nextDealGate = {
    readyCount: humans.filter((s) => ready.has(s)).length,
    humanCount: humans.length,
    iAmReady: ready.has(seat),
  };
  return gv;
}

/** Resolve a full ScoringRules from the lobby settings, falling back to defaults. */
export function scoringFromSettings(settings: GameSettings): ScoringRules {
  const d = DEFAULT_SCORING_RULES;
  return {
    countContractOnlyIfMade: settings.countContractOnlyIfMade ?? d.countContractOnlyIfMade,
    failedContractDefensePoints:
      settings.failedContractDefensePoints ?? d.failedContractDefensePoints,
    zeroPointsForNonContractingTeamWhenContractMade:
      settings.zeroPointsForNonContractingTeamWhenContractMade ??
      d.zeroPointsForNonContractingTeamWhenContractMade,
    capotMadePoints: settings.capotMadePoints ?? d.capotMadePoints,
    capotFailedDefensePoints: settings.capotFailedDefensePoints ?? d.capotFailedDefensePoints,
    allowToutAtoutSansAtout: settings.allowToutAtoutSansAtout ?? d.allowToutAtoutSansAtout,
    requireMorePointsToWin: settings.requireMorePointsToWin ?? d.requireMorePointsToWin,
  };
}
