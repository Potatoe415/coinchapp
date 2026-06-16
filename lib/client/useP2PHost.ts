"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  beginNextDeal,
  createInitialState,
  redact,
  startNextDeal,
  submitBid,
  submitPlay,
  type BotPunch,
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
import { applyBotAction, scoringFromSettings, seededRng, wait } from "./p2p/hostEngine";

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
      createInitialState(settings.targetPoints, scoringFromSettings(settings)),
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
  const decide = useBotWorker(settings.botPunch as BotPunch | undefined);

  const isBotSeat = useCallback((seat: number) => rosterRef.current[seat]?.isBot ?? true, []);

  // Replace the roster (ref drives async loops, state drives the host's render).
  const commitRoster = useCallback((next: RosterEntry[]) => {
    rosterRef.current = next;
    setRoster(next);
  }, []);

  const broadcast = useCallback(
    (next: GameState) => {
      for (const [seat, conn] of connsRef.current) {
        if (rosterRef.current[seat]?.isBot) continue;
        const view = buildSeatView(next, seat as Seat, rosterRef.current, settings, mySeat);
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
      let guard = 0;
      while (guard++ < 64) {
        const prev = stateRef.current;
        if (prev.phase !== "bidding" && prev.phase !== "playing") break;
        if (!isBotSeat(prev.turn)) break;
        const seat = prev.turn as Seat;
        const [action] = await Promise.all([decide(redact(prev, seat)), wait(BOT_THINKING_MS)]);
        const next = applyBotAction(prev, seat, action);
        commit(next);
        if (next.tricks.length > prev.tricks.length) await wait(COLLECT_DELAY_MS);
      }
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
        else if (msg.t === "play") next = submitPlay(prev, seat, msg.card);
        else next = startNextDeal(prev);
      } catch {
        return;
      }
      commit(next);
      if (msg.t === "play" && next.tricks.length > prev.tricks.length) await wait(COLLECT_DELAY_MS);
      await runBots();
    },
    [commit, runBots],
  );

  const demoteSeatToBot = useCallback(
    (seat: Seat) => {
      commitRoster(rosterRef.current.map((e) => (e.seat === seat ? { ...e, isBot: true } : e)));
      void runBots();
    },
    [commitRoster, runBots],
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
        else void applyRemote(msg, seat as Seat);
      });
      conn.onClose(() => demoteSeatToBot(seat as Seat));
      const view = buildSeatView(stateRef.current, seat as Seat, rosterRef.current, settings, mySeat);
      conn.send(JSON.stringify({ t: "view", view }));
    }
  }, [applyRemote, applyHello, demoteSeatToBot, settings, mySeat]);

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
      onNextDeal: async () => {
        commit(startNextDeal(stateRef.current));
        await runBots();
      },
    }),
    [commit, runBots, mySeat],
  );

  const gv = buildSeatView(state, mySeat, roster, settings, mySeat);
  return { gv, actions };
}
