"use client";

import Link from "next/link";
import { useGameView } from "@/lib/client/useGameView";
import { nextDeal, placeBid, playCard } from "@/lib/server/actions-game";
import type { Card } from "@/lib/coinche";
import { Lobby } from "./Lobby";
import { GameTable, type GameActions } from "./GameTable";
import type { BidPayload } from "./BiddingPanel";

export function GameRoom({ gameId }: { gameId: string }) {
  const { view, loading, error, refetch } = useGameView(gameId);

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
  };

  if (loading) {
    return <Centered>Chargement…</Centered>;
  }
  if (error || !view) {
    return (
      <Centered>
        <p className="mb-3 text-rose-300" data-id="game-error">
          {error ?? "Partie introuvable"}
        </p>
        <Link href="/" className="rounded-lg bg-emerald-400 px-4 py-2 font-bold text-emerald-950">
          Retour à l’accueil
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
          Cette partie est en cours et vous n’y participez pas.
        </p>
        <Link href="/" className="rounded-lg bg-emerald-400 px-4 py-2 font-bold text-emerald-950">
          Retour à l’accueil
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
