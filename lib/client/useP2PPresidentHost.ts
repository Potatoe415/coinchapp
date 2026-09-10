"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  beginNextRound,
  createInitialState,
  ROUND_AUTO_ADVANCE_MS,
  startNextRound,
  submitExchangeReturn,
  submitPass,
  submitPlay,
  type Card,
  type Combo,
  type GameState,
  type Seat,
} from "@/lib/president";
import type { PresidentActions } from "@/components/PresidentTable";
import type { GameView } from "@/lib/server/view";
import { attachGate, seededRng, wait } from "./p2p/hostEngine";
import type { P2PConnection } from "./p2p/connection";
import { buildPresidentSeatView, parseClientMessage, type ClientMessage, type RosterEntry } from "./p2p/protocol";
import { runBotLoop } from "./cardGameDriver";
import { decidePresidentAction, presidentEngine } from "./presidentEngineAdapter";
import { DEFAULT_BOT_THINK_MS, DEFAULT_PRESIDENT_ROUNDS_TO_PLAY } from "@/lib/supabase/types";

/** Matches the "seat just emptied its hand" pause in `presidentEngineAdapter.ts`. */
const COLLECT_DELAY_MS = 900;

export interface P2PPresidentHostConfig {
  mySeat: Seat;
  roster: RosterEntry[];
  /** Live connection per human (non-host) seat. */
  connections: Map<Seat, P2PConnection>;
  seed: number;
  roundsToPlay?: number;
  /** Paces each bot move: the heuristic bot has no search to overlap, so this
   *  delay alone drives "reflexion" (see GameSettings.botThinkMs). Defaults to
   *  `DEFAULT_BOT_THINK_MS` when absent. */
  botThinkMs?: number;
}

/**
 * Authoritative host for a Président ad-hoc table: same shape as
 * `useP2PBouillaHost` but driven by the Président rules engine (multi-card
 * combos, passes, and the sequential exchange-return phase). See
 * `useP2PHost.ts` for the annotated Coinche version.
 */
export function useP2PPresidentHost(config: P2PPresidentHostConfig): { gv: GameView; actions: PresidentActions } {
  const { mySeat, seed } = config;
  const roundsToPlay = config.roundsToPlay ?? DEFAULT_PRESIDENT_ROUNDS_TO_PLAY;
  const botThinkMs = config.botThinkMs ?? DEFAULT_BOT_THINK_MS;
  const [state, setState] = useState<GameState>(() =>
    beginNextRound(createInitialState(roundsToPlay), seededRng(seed)),
  );
  const stateRef = useRef(state);
  const [roster, setRoster] = useState<RosterEntry[]>(() => config.roster.map((entry) => ({ ...entry })));
  const rosterRef = useRef<RosterEntry[]>(roster);
  const connsRef = useRef(config.connections);
  const busyRef = useRef(false);
  // Seats that pressed "next round"; the round advances only when every human is ready.
  const [ready, setReady] = useState<Set<number>>(() => new Set());
  const readyRef = useRef(ready);

  const isBotSeat = useCallback((seat: number) => rosterRef.current[seat]?.isBot ?? true, []);

  const commitRoster = useCallback((next: RosterEntry[]) => {
    rosterRef.current = next;
    setRoster(next);
  }, []);

  const commitReady = useCallback((next: Set<number>) => {
    readyRef.current = next;
    setReady(next);
  }, []);

  const broadcast = useCallback(
    (next: GameState) => {
      for (const [seat, conn] of connsRef.current) {
        if (rosterRef.current[seat]?.isBot) continue;
        const view = attachGate(
          buildPresidentSeatView(next, seat as Seat, rosterRef.current, {}, mySeat),
          next,
          seat,
          rosterRef.current,
          readyRef.current,
        );
        conn.send(JSON.stringify({ t: "view", view }));
      }
    },
    [mySeat],
  );

  const commit = useCallback(
    (next: GameState) => {
      stateRef.current = next;
      setState(next);
      broadcast(next);
    },
    [broadcast],
  );

  const runBots = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await runBotLoop({
        engine: presidentEngine,
        getState: () => stateRef.current,
        isBot: isBotSeat,
        decide: decidePresidentAction,
        commit,
        thinkingMs: botThinkMs,
        collectDelayMs: COLLECT_DELAY_MS,
      });
    } finally {
      busyRef.current = false;
    }
  }, [commit, isBotSeat, botThinkMs]);

  const applyRemote = useCallback(
    async (msg: ClientMessage, seat: Seat) => {
      const prev = stateRef.current;
      let next: GameState;
      try {
        if (msg.t === "combo") next = submitPlay(prev, seat, msg.combo as unknown as Combo);
        else if (msg.t === "pass") next = submitPass(prev, seat);
        else if (msg.t === "exchangeReturn") next = submitExchangeReturn(prev, seat, msg.cards as unknown as Card[]);
        else return; // hello/nextDeal/play(Coinche-only) are handled separately
      } catch {
        return;
      }
      commit(next);
      if (next.finishedOrder.length > prev.finishedOrder.length) await wait(COLLECT_DELAY_MS);
      await runBots();
    },
    [commit, runBots],
  );

  // Actually start the next round, whether every human agreed or the auto-advance cap below fired.
  const forceAdvance = useCallback(() => {
    if (stateRef.current.phase !== "scoring") return;
    commitReady(new Set());
    commit(startNextRound(stateRef.current));
    void runBots();
  }, [commit, commitReady, runBots]);

  // Start the next round only when every human seat has signaled it is ready.
  const tryAdvance = useCallback(
    (readySet: Set<number>): boolean => {
      const humans = rosterRef.current.filter((e) => !e.isBot).map((e) => e.seat);
      if (humans.length === 0 || !humans.every((s) => readySet.has(s))) return false;
      forceAdvance();
      return true;
    },
    [forceAdvance],
  );

  // Score table cap: even if some human never presses "Manche suivante", the round
  // starts anyway after ROUND_AUTO_ADVANCE_MS (mirrors the online gate, see
  // `lib/server/round-gate.ts`).
  useEffect(() => {
    if (state.phase !== "scoring") return;
    const timer = setTimeout(forceAdvance, ROUND_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [state.phase, forceAdvance]);

  const markReady = useCallback(
    (seat: Seat) => {
      if (stateRef.current.phase !== "scoring") return;
      const next = new Set(readyRef.current).add(seat);
      if (!tryAdvance(next)) {
        commitReady(next);
        broadcast(stateRef.current);
      }
    },
    [tryAdvance, commitReady, broadcast],
  );

  const demoteSeatToBot = useCallback(
    (seat: Seat) => {
      commitRoster(rosterRef.current.map((e) => (e.seat === seat ? { ...e, isBot: true } : e)));
      if (stateRef.current.phase === "scoring") tryAdvance(readyRef.current);
      void runBots();
    },
    [commitRoster, tryAdvance, runBots],
  );

  const applyHello = useCallback(
    (seat: Seat, name: string) => {
      commitRoster(rosterRef.current.map((e) => (e.seat === seat ? { ...e, displayName: name } : e)));
      broadcast(stateRef.current);
    },
    [commitRoster, broadcast],
  );

  useEffect(() => {
    for (const [seat, conn] of connsRef.current) {
      conn.onMessage((raw) => {
        const msg = parseClientMessage(raw);
        if (!msg) return;
        if (msg.t === "hello") applyHello(seat as Seat, msg.name);
        else if (msg.t === "nextDeal") markReady(seat as Seat);
        else void applyRemote(msg, seat as Seat);
      });
      conn.onClose(() => demoteSeatToBot(seat as Seat));
      const view = attachGate(
        buildPresidentSeatView(stateRef.current, seat as Seat, rosterRef.current, {}, mySeat),
        stateRef.current,
        seat,
        rosterRef.current,
        readyRef.current,
      );
      conn.send(JSON.stringify({ t: "view", view }));
    }
  }, [applyRemote, applyHello, markReady, demoteSeatToBot, mySeat]);

  useEffect(() => {
    void runBots();
  }, [runBots]);

  const actions: PresidentActions = useMemo(
    () => ({
      onPlay: async (combo: Combo) => {
        const prev = stateRef.current;
        const next = submitPlay(prev, mySeat, combo);
        commit(next);
        if (next.finishedOrder.length > prev.finishedOrder.length) await wait(COLLECT_DELAY_MS);
        await runBots();
      },
      onPass: async () => {
        const next = submitPass(stateRef.current, mySeat);
        commit(next);
        await runBots();
      },
      onExchangeReturn: async (cards: Card[]) => {
        const next = submitExchangeReturn(stateRef.current, mySeat, cards);
        commit(next);
        await runBots();
      },
      onNextRound: () => {
        markReady(mySeat);
      },
    }),
    [commit, runBots, markReady, mySeat],
  );

  const gv = attachGate(buildPresidentSeatView(state, mySeat, roster, {}, mySeat), state, mySeat, roster, ready);
  return { gv, actions };
}
