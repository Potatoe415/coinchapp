"use client";

/**
 * Generic "advance the bots" loop shared by every offline-authoritative driver (local solo,
 * ad-hoc P2P host) across every game (Coinche, Bouilla, ...). Each game plugs in its own
 * `BotLoopEngine` adapter; this file only knows about the turn-by-turn loop mechanics
 * (thinking delay, commit, trick-collect wait), never about a specific game's rules.
 */

export interface BotLoopEngine<TState, TView, TAction> {
  /** Whether the seat whose turn it is right now is a bot that should act automatically. */
  isBotTurn(state: TState, isBot: (seat: number) => boolean): boolean;
  currentTurn(state: TState): number;
  redact(state: TState, seat: number): TView;
  applyBotAction(state: TState, seat: number, action: TAction): TState;
  /** True right after a trick was just collected, to trigger the collect-delay wait
   *  (matches the CSS trick-collect animation duration). */
  didCollectTrick(prev: TState, next: TState): boolean;
}

export interface BotLoopParams<TState, TView, TAction> {
  engine: BotLoopEngine<TState, TView, TAction>;
  getState: () => TState;
  isBot: (seat: number) => boolean;
  decide: (view: TView, seat: number) => Promise<TAction>;
  commit: (state: TState) => void;
  thinkingMs: number;
  collectDelayMs: number;
  guardLimit?: number;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Deterministic RNG (mulberry32), shared by every mode that needs a reproducible shuffle. */
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

/** Auto-play bot seats one move at a time until it is a human's turn or the game ends.
 *  The caller is responsible for its own re-entrancy guard (e.g. a `busyRef`). */
export async function runBotLoop<TState, TView, TAction>(
  params: BotLoopParams<TState, TView, TAction>,
): Promise<void> {
  const { engine, getState, isBot, decide, commit, thinkingMs, collectDelayMs, guardLimit = 64 } = params;
  let guard = 0;
  while (guard++ < guardLimit) {
    const prev = getState();
    if (!engine.isBotTurn(prev, isBot)) break;
    const seat = engine.currentTurn(prev);
    const [action] = await Promise.all([decide(engine.redact(prev, seat), seat), wait(thinkingMs)]);
    const next = engine.applyBotAction(prev, seat, action);
    commit(next);
    if (engine.didCollectTrick(prev, next)) await wait(collectDelayMs);
  }
}
