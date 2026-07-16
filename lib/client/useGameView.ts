"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getView } from "@/lib/server/actions-game";
import type { GameView } from "@/lib/server/view";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonAuth } from "./auth";

export interface GameViewState {
  view: GameView | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Tell peers to refetch immediately via a fast broadcast (vs. slow postgres_changes). */
  notify: () => void;
  /** Manual escape hatch: re-fetch and rebuild the realtime channel right now. */
  forceResync: () => void;
}

type SupabaseClient = ReturnType<typeof createClient>;
type Channel = ReturnType<SupabaseClient["channel"]>;

/**
 * Safety-net poll: catches any missed tick even if the realtime channel and
 * its reconnection logic both fail silently (last-resort self-healing).
 */
const POLL_MS = 15000;
/** Backoff before retrying a channel that reported an error/timeout. */
const RESUBSCRIBE_DELAY_MS = 1000;
const BAD_STATUSES = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

/**
 * Realtime websockets can die silently (mobile tab backgrounded/locked,
 * network switch, long idle session). A missed postgres_changes event is
 * never replayed, so a client stuck like this never learns the game moved
 * on - if that client is the bot-driving host, the whole table freezes.
 * This subscribes to the game's tick channel and calls onTick on every
 * event, retrying the subscription itself if the channel reports a bad
 * status instead of relying on it to silently recover.
 */
function subscribeTicks(
  supabase: SupabaseClient,
  gameId: string,
  onTick: () => void,
  onBadStatus: () => void,
): Channel {
  return supabase
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "game_events", filter: `game_id=eq.${gameId}` },
      onTick,
    )
    .on("broadcast", { event: "tick" }, onTick)
    .subscribe((status) => {
      if (BAD_STATUSES.has(status)) onBadStatus();
    });
}

/** Load the redacted game view and refetch whenever a realtime tick fires. */
export function useGameView(gameId: string): GameViewState {
  const [view, setView] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<Channel | null>(null);
  const resubscribeRef = useRef<() => void>(() => {});

  const refetch = useCallback(async () => {
    try {
      setView(await getView(gameId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const notify = useCallback(() => {
    void channelRef.current?.send({ type: "broadcast", event: "tick", payload: {} });
  }, []);

  const resubscribe = useCallback(() => {
    const supabase = supabaseRef.current;
    if (channelRef.current) void supabase.removeChannel(channelRef.current);
    channelRef.current = subscribeTicks(
      supabase,
      gameId,
      () => void refetch(),
      () => setTimeout(() => resubscribeRef.current(), RESUBSCRIBE_DELAY_MS),
    );
  }, [gameId, refetch]);

  useEffect(() => {
    resubscribeRef.current = resubscribe;
  }, [resubscribe]);

  useEffect(() => {
    let active = true;
    const supabase = supabaseRef.current;
    (async () => {
      await ensureAnonAuth();
      if (active) await refetch();
    })();
    resubscribe();
    return () => {
      active = false;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [gameId, refetch, resubscribe]);

  // Backstop for missed events: re-sync whenever the tab/network comes back,
  // plus a low-frequency poll in case even that goes unnoticed.
  useEffect(() => {
    const onWake = () => {
      void refetch();
      resubscribeRef.current();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") onWake();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onWake);
    const poll = setInterval(() => void refetch(), POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onWake);
      clearInterval(poll);
    };
  }, [refetch]);

  const forceResync = useCallback(() => {
    void refetch();
    resubscribeRef.current();
  }, [refetch]);

  return { view, loading, error, refetch, notify, forceResync };
}
