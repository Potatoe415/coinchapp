"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/client/i18n";
import { useBotRunner } from "@/lib/client/useBotRunner";
import { useGameView } from "@/lib/client/useGameView";
import { ensureAnonAuth } from "@/lib/client/auth";
import { becomeHost, nextDeal, placeBid, playCard } from "@/lib/server/actions-game";
import type { Card } from "@/lib/coinche";
import { createClient } from "@/lib/supabase/client";
import type { EmojiReaction } from "./EmojiButton";
import { Lobby } from "./Lobby";
import { GameTable, type GameActions } from "./GameTable";
import type { BidPayload } from "./BiddingPanel";

const REACTION_TTL = 3000;

type EmojiPayload = { seat: number; emoji: string };
type Channel = ReturnType<ReturnType<typeof createClient>["channel"]>;

export function GameRoom({ gameId }: { gameId: string }) {
  const { t } = useI18n();
  const { view, loading, error, refetch } = useGameView(gameId);
  useBotRunner(gameId, view, refetch);

  const [reactions, setReactions] = useState<Map<number, EmojiReaction>>(new Map());
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const channelRef = useRef<Channel | null>(null);

  const addReaction = useCallback((seat: number, emoji: string) => {
    const prev = timers.current.get(seat);
    if (prev) clearTimeout(prev);
    setReactions((m) => new Map(m).set(seat, { emoji, id: Date.now() }));
    timers.current.set(
      seat,
      setTimeout(() => {
        setReactions((m) => { const n = new Map(m); n.delete(seat); return n; });
        timers.current.delete(seat);
      }, REACTION_TTL),
    );
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`emoji-${gameId}`)
      .on("broadcast", { event: "emoji" }, ({ payload }: { payload: EmojiPayload }) => {
        addReaction(payload.seat, payload.emoji);
      })
      .subscribe();
    channelRef.current = ch;
    void ensureAnonAuth();
    return () => {
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [gameId, addReaction]);

  const actions: GameActions = {
    onBid: async (payload: BidPayload) => {
      await placeBid(gameId, payload);
    },
    onPlay: async (card: Card) => {
      await playCard(gameId, card);
    },
    onNextDeal: async () => {
      await nextDeal(gameId);
    },
    onBecomeHost: async () => {
      await becomeHost(gameId);
      await refetch();
    },
    onSendEmoji: (emoji: string) => {
      const mySeat = view?.mySeat;
      if (mySeat === null || mySeat === undefined) return;
      void channelRef.current?.send({
        type: "broadcast",
        event: "emoji",
        payload: { seat: mySeat, emoji } satisfies EmojiPayload,
      });
      addReaction(mySeat, emoji);
    },
  };

  if (loading) {
    return <Centered>{t("loading")}</Centered>;
  }
  if (error || !view) {
    return (
      <Centered>
        <p className="mb-3 text-[var(--accent-red)]" data-id="game-error">
          {error ?? t("gameNotFound")}
        </p>
        <Link href="/" className="rounded-lg bg-[var(--accent-yellow)] px-4 py-2 font-bold text-[var(--surface)]">
          {t("backHome")}
        </Link>
      </Centered>
    );
  }

  if (view.status === "lobby") {
    return <Lobby gv={view} onChange={refetch} />;
  }

  if (view.mySeat === null || !view.view) {
    return (
      <Centered>
        <p className="mb-3" data-id="game-spectator-notice">
          {t("gameInProgressSpectator")}
        </p>
        <Link href="/" className="rounded-lg bg-[var(--accent-yellow)] px-4 py-2 font-bold text-[var(--surface)]">
          {t("backHome")}
        </Link>
      </Centered>
    );
  }

  return <GameTable gv={view} actions={actions} reactions={reactions} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" data-id="game-loading">
      {children}
    </div>
  );
}
