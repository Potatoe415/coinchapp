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
}

/** Load the redacted game view and refetch whenever a realtime tick fires. */
export function useGameView(gameId: string): GameViewState {
  const [view, setView] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

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

  useEffect(() => {
    let active = true;
    const supabase = supabaseRef.current;

    (async () => {
      await ensureAnonAuth();
      if (active) await refetch();
    })();

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_events", filter: `game_id=eq.${gameId}` },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [gameId, refetch]);

  return { view, loading, error, refetch };
}
