"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { beginNextRound, createInitialState, startNextRound, submitPlay, type Card, type GameState, type Seat } from "@/lib/bouilla";
import type { BouillaActions } from "@/components/BouillaTable";
import type { GameView } from "@/lib/server/view";
import { attachGate, seededRng, wait } from "./p2p/hostEngine";
import type { P2PConnection } from "./p2p/connection";
import { buildBouillaSeatView, parseClientMessage, type ClientMessage, type RosterEntry } from "./p2p/protocol";
import { runBotLoop } from "./cardGameDriver";
import { bouillaEngine, decideBouillaAction } from "./bouillaEngineAdapter";

/** Must match the CSS trick-collect animation duration. */
const COLLECT_DELAY_MS = 1500;
const BOT_THINKING_MS = 500;

export interface P2PBouillaHostConfig {
  mySeat: Seat;
  roster: RosterEntry[];
  /** Live connection per human (non-host) seat. */
  connections: Map<Seat, P2PConnection>;
  seed: number;
}

/**
 * Authoritative host for a Bouilla ad-hoc table: same shape as `useP2PHost`
 * (Coinche) but without bidding, driven by the Bouilla rules engine and
 * heuristic bot. See `useP2PHost.ts` for the annotated Coinche version.
 */
export function useP2PBouillaHost(config: P2PBouillaHostConfig): { gv: GameView; actions: BouillaActions } {
  const { mySeat, seed } = config;
  const [state, setState] = useState<GameState>(() => beginNextRound(createInitialState(), seededRng(seed)));
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
          buildBouillaSeatView(next, seat as Seat, rosterRef.current, {}, mySeat),
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
        engine: bouillaEngine,
        getState: () => stateRef.current,
        isBot: isBotSeat,
        decide: decideBouillaAction,
        commit,
        thinkingMs: BOT_THINKING_MS,
        collectDelayMs: COLLECT_DELAY_MS,
      });
    } finally {
      busyRef.current = false;
    }
  }, [commit, isBotSeat]);

  const applyRemote = useCallback(
    async (msg: ClientMessage, seat: Seat) => {
      if (msg.t !== "play") return; // hello/nextDeal are handled separately, no bidding in Bouilla
      const prev = stateRef.current;
      let next: GameState;
      try {
        next = submitPlay(prev, seat, msg.card as unknown as Card);
      } catch {
        return;
      }
      commit(next);
      if (next.tricks.length > prev.tricks.length) await wait(COLLECT_DELAY_MS);
      await runBots();
    },
    [commit, runBots],
  );

  // Start the next round only when every human seat has signaled it is ready.
  const tryAdvance = useCallback(
    (readySet: Set<number>): boolean => {
      const humans = rosterRef.current.filter((e) => !e.isBot).map((e) => e.seat);
      if (humans.length === 0 || !humans.every((s) => readySet.has(s))) return false;
      commitReady(new Set());
      commit(startNextRound(stateRef.current));
      void runBots();
      return true;
    },
    [commit, commitReady, runBots],
  );

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
        buildBouillaSeatView(stateRef.current, seat as Seat, rosterRef.current, {}, mySeat),
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

  const actions: BouillaActions = useMemo(
    () => ({
      onPlay: async (card) => {
        const prev = stateRef.current;
        const next = submitPlay(prev, mySeat, card);
        commit(next);
        if (next.tricks.length > prev.tricks.length) await wait(COLLECT_DELAY_MS);
        await runBots();
      },
      onNextRound: () => {
        markReady(mySeat);
      },
    }),
    [commit, runBots, markReady, mySeat],
  );

  const gv = attachGate(buildBouillaSeatView(state, mySeat, roster, {}, mySeat), state, mySeat, roster, ready);
  return { gv, actions };
}
