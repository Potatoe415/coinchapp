"use client";

import Link from "next/link";
import { useI18n } from "@/lib/client/i18n";
import { useBotRunner } from "@/lib/client/useBotRunner";
import { useGameView } from "@/lib/client/useGameView";
import { becomeHost, nextDeal, placeBid, playCard } from "@/lib/server/actions-game";
import type { Card } from "@/lib/coinche";
import { Lobby } from "./Lobby";
import { GameTable, type GameActions } from "./GameTable";
import type { BidPayload } from "./BiddingPanel";

export function GameRoom({ gameId }: { gameId: string }) {
  const { t } = useI18n();
  const { view, loading, error, refetch } = useGameView(gameId);
  useBotRunner(gameId, view, refetch);

  const actions: GameActions = {
    onBid: async (payload: BidPayload) => {
      await placeBid(gameId, payload);
      await refetch();
    },
    onPlay: async (card: Card) => {
      await playCard(gameId, card);
      await refetch();
    },
    onNextDeal: async () => {
      await nextDeal(gameId);
      await refetch();
    },
    onBecomeHost: async () => {
      await becomeHost(gameId);
      await refetch();
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

  return <GameTable gv={view} actions={actions} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" data-id="game-loading">
      {children}
    </div>
  );
}
