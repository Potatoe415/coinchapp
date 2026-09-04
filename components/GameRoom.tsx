"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/client/i18n";
import { parseReactionPayload, type ReactionPick } from "@/lib/client/reactions";
import { useBotRunner } from "@/lib/client/useBotRunner";
import { useGameView } from "@/lib/client/useGameView";
import { useReactions } from "@/lib/client/useReactions";
import { useStillThereTimer } from "@/lib/client/useStillThereTimer";
import { ensureAnonAuth } from "@/lib/client/auth";
import { becomeHost, nextDeal, placeBid, playCard, readyForNextRound } from "@/lib/server/actions-game";
import { joinBotSeat, rematchGame } from "@/lib/server/actions-lobby";
import { BotDebugOverlay } from "./BotDebugOverlay";
import { BotSeatPicker } from "./BotSeatPicker";
import type { Card } from "@/lib/coinche";
import type { Card as BouillaCard } from "@/lib/bouilla";
import { createClient } from "@/lib/supabase/client";
import { Lobby } from "./Lobby";
import { GameTable, type GameActions, type CoincheGameView } from "./GameTable";
import { BouillaTable, type BouillaActions, type BouillaGameView } from "./BouillaTable";
import type { BidPayload } from "./BiddingPanel";
import { StillThereModal } from "./StillThereModal";

type Channel = ReturnType<ReturnType<typeof createClient>["channel"]>;

export function GameRoom({ gameId }: { gameId: string }) {
  const { t, locale } = useI18n();
  const { view, loading, error, refetch, notify, forceResync } = useGameView(gameId);
  const [debugMode, setDebugMode] = useState(false);
  const botDebugLog = useBotRunner(gameId, view, refetch, notify, debugMode);
  const stillThere = useStillThereTimer(view, refetch);
  const { reactions, addReaction } = useReactions();

  const [joiningBotSeat, setJoiningBotSeat] = useState(false);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`emoji-${gameId}`)
      .on("broadcast", { event: "emoji" }, ({ payload }: { payload: unknown }) => {
        const parsed = parseReactionPayload(payload);
        if (parsed) addReaction(parsed.seat, parsed.pick);
      })
      .subscribe();
    channelRef.current = ch;
    void ensureAnonAuth();
    return () => {
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [gameId, addReaction]);

  const onSendReaction = useCallback(
    (pick: ReactionPick) => {
      const mySeat = view?.mySeat;
      if (mySeat === null || mySeat === undefined) return;
      void channelRef.current?.send({
        type: "broadcast",
        event: "emoji",
        payload: { seat: mySeat, ...pick },
      });
      addReaction(mySeat, pick);
    },
    [view?.mySeat, addReaction],
  );
  const onBecomeHost = async () => {
    await becomeHost(gameId);
    await refetch();
  };
  const onJoinBotSeat = async (seat: number, displayName: string) => {
    if (!view) return;
    setJoiningBotSeat(true);
    try {
      await joinBotSeat({ roomCode: view.roomCode, seat, displayName, locale });
      notify();
      await refetch();
    } finally {
      setJoiningBotSeat(false);
    }
  };
  const onRematch = async () => {
    await rematchGame(gameId);
    notify();
    await refetch();
  };

  const coincheActions: GameActions = {
    onBid: async (payload: BidPayload) => {
      await placeBid(gameId, payload);
      notify();
      await refetch();
    },
    onPlay: async (card: Card) => {
      await playCard(gameId, card);
      notify();
      await refetch();
    },
    onNextDeal: async () => {
      await nextDeal(gameId);
      notify();
      await refetch();
    },
    onBecomeHost,
    onForceSync: forceResync,
    onSendReaction,
    onRematch,
  };

  const bouillaActions: BouillaActions = {
    onPlay: async (card: BouillaCard) => {
      await playCard(gameId, card);
      notify();
      await refetch();
    },
    onNextRound: async () => {
      await readyForNextRound(gameId);
      notify();
      await refetch();
    },
    onBecomeHost,
    onForceSync: forceResync,
    onSendReaction,
    onRematch,
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
    return <Lobby gv={view} onChange={refetch} debugMode={debugMode} onDebugModeChange={setDebugMode} />;
  }

  if (view.mySeat === null || !view.view) {
    // Mid-game, a non-member can still take over a bot seat directly (see
    // BotSeatPicker); a finished game or one with no bot seat left falls
    // back to the plain spectator notice.
    if (view.status === "playing" && view.players.some((p) => p.isBot)) {
      return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="game-spectator-join">
          <BotSeatPicker players={view.players} busy={joiningBotSeat} onJoinSeat={onJoinBotSeat} />
        </main>
      );
    }
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

  return (
    <>
      {stillThere.show && <StillThereModal secondsLeft={stillThere.secondsLeft} />}
      {view.gameType === "bouilla" && debugMode && <BotDebugOverlay log={botDebugLog} />}
      {view.gameType === "bouilla" ? (
        <BouillaTable gv={view as BouillaGameView} actions={bouillaActions} reactions={reactions} />
      ) : (
        <GameTable gv={view as CoincheGameView} actions={coincheActions} reactions={reactions} />
      )}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" data-id="game-loading">
      {children}
    </div>
  );
}
