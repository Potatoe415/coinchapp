"use client";

import { useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { cardId, RANKS, type Card, type PlayedCard, type PlayerView } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import { BiddingPanel, type BidPayload } from "./BiddingPanel";
import { GameHud } from "./GameHud";
import { GameTableScene } from "./GameTableScene";
import { playerName, relativeSeat } from "./gameTableHelpers";
import { PlayingCard } from "./PlayingCard";

export interface GameActions {
  onBid: (payload: BidPayload) => Promise<void> | void;
  onPlay: (card: Card) => Promise<void> | void;
  onNextDeal: () => Promise<void> | void;
  /** Online only: take over running the bots. */
  onBecomeHost?: () => Promise<void> | void;
  /** Local only: restart the game from scratch with same settings. */
  onReset?: () => void;
}

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 };
const PLAY_ANIMATION_MS = 440;

type PendingPlayedCard = PlayedCard;

function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) =>
    a.suit !== b.suit
      ? SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
      : RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank),
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function GameTable({ gv, actions }: { gv: GameView; actions: GameActions }) {
  const view = gv.view!;
  const mySeat = gv.mySeat!;
  const [busy, setBusy] = useState(false);
  const [pendingPlayed, setPendingPlayed] = useState<PendingPlayedCard | null>(null);
  const legalSet = new Set(view.legalCards.map(cardId));
  const myTurnToPlay = view.phase === "playing" && view.turn === mySeat;
  const seats = {
    top: relativeSeat(mySeat, 2),
    left: relativeSeat(mySeat, 3),
    right: relativeSeat(mySeat, 1),
    bottom: mySeat,
  };
  const trickCards = [...view.currentTrick.cards];
  const pendingInLastTrick =
    pendingPlayed !== null && (view.lastTrick?.cards.some((c) => c.seat === pendingPlayed.seat) ?? false);
  if (pendingPlayed && !pendingInLastTrick && !trickCards.some((played) => played.seat === pendingPlayed.seat)) {
    trickCards.push(pendingPlayed);
  }
  const trickBySeat = new Map<number, Card>(trickCards.map((c: PlayedCard) => [c.seat, c.card]));
  const lastTrickBySeat = view.lastTrick
    ? new Map<number, Card>(view.lastTrick.cards.map((c: PlayedCard) => [c.seat, c.card]))
    : null;
  const lastTrickKey = view.lastTrick
    ? view.lastTrick.cards.map((played) => `${played.seat}:${cardId(played.card)}`).join("|")
    : null;
  const lastTrickWinner = view.lastTrick?.winner ?? null;

  async function onPlay(card: Card) {
    if (!myTurnToPlay || !legalSet.has(cardId(card)) || busy) return;
    setBusy(true);
    setPendingPlayed({ seat: mySeat, card });
    try {
      await wait(PLAY_ANIMATION_MS);
      await actions.onPlay(card);
    } finally {
      setPendingPlayed(null);
      setBusy(false);
    }
  }

  return (
    <main
      className="relative mx-auto flex min-h-svh w-full max-w-[460px] flex-1 overflow-hidden bg-felt text-[var(--card-face)]"
      data-id="game-table"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#3aa59b_0%,#2f877f_48%,#276f69_100%)]" />
      <GameHud
        view={view}
        onReset={actions.onReset}
        host={
          actions.onBecomeHost
            ? {
                isHost: gv.isHost,
                hostName: gv.hostSeat !== null ? playerName(gv, gv.hostSeat) : null,
                onBecomeHost: actions.onBecomeHost,
              }
            : undefined
        }
      />
      <GameTableScene
        gv={gv}
        view={view}
        seats={seats}
        trickBySeat={trickBySeat}
        lastTrickBySeat={lastTrickBySeat}
        lastTrickKey={lastTrickKey}
        lastTrickWinner={lastTrickWinner}
        onNextDeal={actions.onNextDeal}
      />
      <ActionDock
        view={view}
        legalSet={legalSet}
        myTurnToPlay={myTurnToPlay}
        busy={busy}
        onBid={actions.onBid}
        onPlay={onPlay}
      />
    </main>
  );
}

function HandFan({
  hand,
  legalSet,
  myTurnToPlay,
  busy,
  onPlay,
}: {
  hand: Card[];
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  busy: boolean;
  onPlay: (card: Card) => void;
}) {
  const sorted = sortHand(hand);
  const n = sorted.length;

  return (
    <div className="relative h-[8.5rem] w-full" data-id="my-hand">
      {sorted.map((card, i) => (
        <HandCard
          key={cardId(card)}
          card={card}
          index={i}
          count={n}
          legalSet={legalSet}
          myTurnToPlay={myTurnToPlay}
          busy={busy}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}

function HandCard({
  card,
  index,
  count,
  legalSet,
  myTurnToPlay,
  busy,
  onPlay,
}: {
  card: Card;
  index: number;
  count: number;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  busy: boolean;
  onPlay: (card: Card) => void;
}) {
  const isPlayable = myTurnToPlay && legalSet.has(cardId(card));
  const isDimmed = myTurnToPlay && !legalSet.has(cardId(card));
  const left = count > 1 ? `calc(${index} * (100% - 64px) / ${count - 1})` : "calc(50% - 32px)";

  return (
    <div
      className="absolute bottom-0 transition-transform duration-150"
      style={{ left, zIndex: isPlayable ? 50 + index : index, transform: isPlayable ? "translateY(-14px)" : "none" }}
    >
      <PlayingCard
        card={card}
        size="lg"
        dataId={`hand-card-${cardId(card)}`}
        playable={isPlayable}
        dimmed={isDimmed}
        onClick={() => !busy && onPlay(card)}
      />
    </div>
  );
}

function ActionDock({
  view,
  legalSet,
  myTurnToPlay,
  busy,
  onBid,
  onPlay,
}: {
  view: PlayerView;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  busy: boolean;
  onBid: (payload: BidPayload) => Promise<void> | void;
  onPlay: (card: Card) => void;
}) {
  return (
    <section className="absolute inset-x-0 bottom-0 z-20 px-0 pb-1" data-id="action-area">
      <BiddingStatus view={view} onBid={onBid} />
      <HandFan
        hand={view.myHand}
        legalSet={legalSet}
        myTurnToPlay={myTurnToPlay}
        busy={busy}
        onPlay={onPlay}
      />
    </section>
  );
}

function BiddingStatus({
  view,
  onBid,
}: {
  view: PlayerView;
  onBid: (payload: BidPayload) => Promise<void> | void;
}) {
  const { t } = useI18n();
  if (view.phase !== "bidding") return null;
  if (!view.bidOptions) {
    return (
      <p className="mx-6 mb-3 rounded-full bg-[var(--surface-overlay)] py-2 text-center text-sm font-bold text-[var(--card-face)]/85">
        {t("biddingInProgress")}
      </p>
    );
  }
  return (
    <div className="mx-3 mb-2 rounded-2xl bg-[var(--surface-overlay)] p-3 shadow-xl">
      <BiddingPanel options={view.bidOptions} onBid={onBid} />
    </div>
  );
}
