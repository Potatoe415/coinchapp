"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  beginNextDeal,
  createInitialState,
  startNextDeal,
  submitBid,
  submitPlay,
  type BotPunch,
  type Card,
  type GameState,
  type Seat,
} from "@/lib/coinche";
import type { GameActions } from "@/components/GameTable";
import type { GameView } from "@/lib/server/view";
import type { GameSettings } from "@/lib/supabase/types";
import { useBotWorker } from "./useBotWorker";
import type { P2PConnection } from "./p2p/connection";
import {
  buildSeatView,
  parseClientMessage,
  type ClientMessage,
  type RosterEntry,
} from "./p2p/protocol";
import { attachGate, scoringFromSettings, seededRng, wait } from "./p2p/hostEngine";
import { runBotLoop } from "./cardGameDriver";
import { coincheEngine } from "./coincheEngineAdapter";

/** Must match the CSS trick-collect animation duration. */
const COLLECT_DELAY_MS = 1500;
const BOT_THINKING_MS = 500;

export interface P2PHostConfig {
  mySeat: Seat;
  roster: RosterEntry[];
  /** Live connection per human (non-host) seat. */
  connections: Map<Seat, P2PConnection>;
  settings: GameSettings;
  seed: number;
}

/**
 * Authoritative host: runs the pure rules engine for 4 humans + bots in the
 * browser, drives every bot (and any disconnected seat), and streams each
 * client its redacted GameView. The host is also a player.
 */
export function useP2PHost(config: P2PHostConfig): { gv: GameView; actions: GameActions } {
  const { mySeat, settings, seed } = config;
  const [state, setState] = useState<GameState>(() =>
    beginNextDeal(
      createInitialState(settings.targetPoints ?? 1000, scoringFromSettings(settings)),
      seededRng(seed),
    ),
  );
  const stateRef = useRef(state);
  const [roster, setRoster] = useState<RosterEntry[]>(() =>
    config.roster.map((entry) => ({ ...entry })),
  );
  const rosterRef = useRef<RosterEntry[]>(roster);
  const connsRef = useRef(config.connections);
  const busyRef = useRef(false);
  // Seats that pressed "next deal"; the deal advances only when every human is ready.
  const [ready, setReady] = useState<Set<number>>(() => new Set());
  const readyRef = useRef(ready);
  const decide = useBotWorker(settings.botPunch as BotPunch | undefined);

  const isBotSeat = useCallback((seat: number) => rosterRef.current[seat]?.isBot ?? true, []);

  // Replace the roster (ref drives async loops, state drives the host's render).
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
          buildSeatView(next, seat as Seat, rosterRef.current, settings, mySeat),
          next,
          seat,
          rosterRef.current,
          readyRef.current,
        );
        conn.send(JSON.stringify({ t: "view", view }));
      }
    },
    [mySeat, settings],
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
        engine: coincheEngine,
        getState: () => stateRef.current,
        isBot: isBotSeat,
        decide,
        commit,
        thinkingMs: BOT_THINKING_MS,
        collectDelayMs: COLLECT_DELAY_MS,
      });
    } finally {
      busyRef.current = false;
    }
  }, [commit, decide, isBotSeat]);

  const applyRemote = useCallback(
    async (msg: ClientMessage, seat: Seat) => {
      const prev = stateRef.current;
      let next: GameState;
      try {
        if (msg.t === "bid") next = submitBid(prev, { seat, ...msg.payload });
        else if (msg.t === "play") next = submitPlay(prev, seat, msg.card as unknown as Card);
        else return; // hello/nextDeal are handled separately
      } catch {
        return;
      }
      commit(next);
      if (msg.t === "play" && next.tricks.length > prev.tricks.length) await wait(COLLECT_DELAY_MS);
      await runBots();
    },
    [commit, runBots],
  );

  // Start the next deal only when every human seat has signaled it is ready.
  const tryAdvance = useCallback(
    (readySet: Set<number>): boolean => {
      const humans = rosterRef.current.filter((e) => !e.isBot).map((e) => e.seat);
      if (humans.length === 0 || !humans.every((s) => readySet.has(s))) return false;
      commitReady(new Set());
      commit(startNextDeal(stateRef.current));
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
      // A dropped human must not block the next-deal gate.
      if (stateRef.current.phase === "scoring") tryAdvance(readyRef.current);
      void runBots();
    },
    [commitRoster, tryAdvance, runBots],
  );

  // A client announces its chosen display name once its channel opens.
  const applyHello = useCallback(
    (seat: Seat, name: string) => {
      commitRoster(
        rosterRef.current.map((e) => (e.seat === seat ? { ...e, displayName: name } : e)),
      );
      broadcast(stateRef.current);
    },
    [commitRoster, broadcast],
  );

  // Route each client's messages and turn its seat into a bot when it drops.
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
        buildSeatView(stateRef.current, seat as Seat, rosterRef.current, settings, mySeat),
        stateRef.current,
        seat,
        rosterRef.current,
        readyRef.current,
      );
      conn.send(JSON.stringify({ t: "view", view }));
    }
  }, [applyRemote, applyHello, markReady, demoteSeatToBot, settings, mySeat]);

  // Handle any opening bot turns (e.g. a bot bids before the host).
  useEffect(() => {
    void runBots();
  }, [runBots]);

  const actions: GameActions = useMemo(
    () => ({
      onBid: async (payload) => {
        commit(submitBid(stateRef.current, { seat: mySeat, ...payload }));
        await runBots();
      },
      onPlay: async (card) => {
        const prev = stateRef.current;
        const next = submitPlay(prev, mySeat, card);
        commit(next);
        if (next.tricks.length > prev.tricks.length) await wait(COLLECT_DELAY_MS);
        await runBots();
      },
      onNextDeal: () => {
        markReady(mySeat);
      },
    }),
    [commit, runBots, markReady, mySeat],
  );

  const gv = attachGate(
    buildSeatView(state, mySeat, roster, settings, mySeat),
    state,
    mySeat,
    roster,
    ready,
  );
  return { gv, actions };
}
