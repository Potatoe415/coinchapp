"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { cardId, isTrump, RANKS, trumpStrength, type Card, type PlayedCard, type PlayerView, type TrumpMode } from "@/lib/coinche";
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

type PendingPlayedCard = PlayedCard;

function sortHand(hand: Card[], trump: TrumpMode | null): Card[] {
  return [...hand].sort((a, b) => {
    const aTrump = isTrump(a, trump);
    const bTrump = isTrump(b, trump);
    if (aTrump !== bTrump) return aTrump ? 1 : -1;
    if (aTrump && bTrump) return trumpStrength(a) - trumpStrength(b);
    if (a.suit !== b.suit) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
  });
}

export function GameTable({ gv, actions }: { gv: GameView; actions: GameActions }) {
  const view = gv.view!;
  const mySeat = gv.mySeat!;
  const [busy, setBusy] = useState(false);
  const [pendingPlayed, setPendingPlayed] = useState<PendingPlayedCard | null>(null);
  const [preSelected, setPreSelected] = useState<string | null>(null);
  const legalSet = new Set(view.legalCards.map(cardId));
  const myTurnToPlay = view.phase === "playing" && view.turn === mySeat;

  // Clear pre-selection when a new deal starts (hand changes).
  const handKey = view.myHand.map(cardId).join(",");
  const prevHandKey = useRef(handKey);
  useEffect(() => {
    if (prevHandKey.current !== handKey) {
      prevHandKey.current = handKey;
      setPreSelected(null);
    }
  }, [handKey]);

  // Auto-play pre-selected card when it becomes our turn.
  const onPlayRef = useRef<(card: Card) => Promise<void>>(async () => {});
  useEffect(() => {
    if (!myTurnToPlay || preSelected === null) return;
    const card = view.myHand.find((c) => cardId(c) === preSelected);
    if (card && legalSet.has(preSelected)) {
      void onPlayRef.current(card);
    } else {
      setPreSelected(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurnToPlay]);
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
    setPreSelected(null);
    setBusy(true);
    setPendingPlayed({ seat: mySeat, card });
    try {
      await actions.onPlay(card);
    } finally {
      setPendingPlayed(null);
      setBusy(false);
    }
  }
  onPlayRef.current = onPlay;

  function onCardClick(card: Card) {
    if (busy) return;
    if (myTurnToPlay) {
      void onPlay(card);
    } else if (view.phase === "playing") {
      const id = cardId(card);
      setPreSelected((prev) => (prev === id ? null : id));
    }
  }

  return (
    <main
      className="relative mx-auto flex h-svh min-h-[720px] w-full max-w-[460px] flex-1 flex-col overflow-hidden bg-felt text-[var(--card-face)]"
      data-id="game-table"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#3aa59b_0%,#2f877f_48%,#276f69_100%)]" />
      <GameHud
        view={view}
        players={gv.players}
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
      <div className="flex-1" aria-hidden="true" />
      <div className="relative h-[720px] w-full shrink-0">
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
          preSelected={preSelected}
          onBid={actions.onBid}
          onCardClick={onCardClick}
        />
      </div>
      <div className="flex-1" aria-hidden="true" />
    </main>
  );
}

const HAND_STEP = 40;
const CARD_W_LG = 64;

function HandFan({
  hand,
  trump,
  legalSet,
  myTurnToPlay,
  busy,
  preSelected,
  onCardClick,
}: {
  hand: Card[];
  trump: TrumpMode | null;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  busy: boolean;
  preSelected: string | null;
  onCardClick: (card: Card) => void;
}) {
  const sorted = sortHand(hand, trump);
  const n = sorted.length;
  const fanW = n > 1 ? CARD_W_LG + (n - 1) * HAND_STEP : CARD_W_LG;

  return (
    <div className="relative flex h-[8.5rem] w-full items-end justify-center" data-id="my-hand">
      <div className="relative h-full" style={{ width: fanW }}>
        {sorted.map((card, i) => (
          <HandCard
            key={cardId(card)}
            card={card}
            index={i}
            legalSet={legalSet}
            myTurnToPlay={myTurnToPlay}
            busy={busy}
            isPreSelected={preSelected === cardId(card)}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}

function HandCard({
  card,
  index,
  legalSet,
  myTurnToPlay,
  busy,
  isPreSelected,
  onCardClick,
}: {
  card: Card;
  index: number;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  busy: boolean;
  isPreSelected: boolean;
  onCardClick: (card: Card) => void;
}) {
  const isPlayable = myTurnToPlay && legalSet.has(cardId(card));
  const isDimmed = myTurnToPlay && !legalSet.has(cardId(card));
  const lift = isPreSelected ? "translateY(-28px)" : isPlayable ? "translateY(-14px)" : "none";

  return (
    <div
      className="absolute bottom-0 transition-transform duration-150"
      style={{ left: index * HAND_STEP, zIndex: isPreSelected ? 60 + index : isPlayable ? 50 + index : index, transform: lift }}
    >
      <div className={isPreSelected ? "rounded-lg ring-2 ring-[var(--accent-yellow)] ring-offset-1 ring-offset-transparent" : undefined}>
        <PlayingCard
          card={card}
          size="lg"
          dataId={`hand-card-${cardId(card)}`}
          playable={isPlayable}
          dimmed={isDimmed}
          onClick={() => !busy && onCardClick(card)}
        />
      </div>
    </div>
  );
}

function ActionDock({
  view,
  legalSet,
  myTurnToPlay,
  busy,
  preSelected,
  onBid,
  onCardClick,
}: {
  view: PlayerView;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  busy: boolean;
  preSelected: string | null;
  onBid: (payload: BidPayload) => Promise<void> | void;
  onCardClick: (card: Card) => void;
}) {
  const [previewTrump, setPreviewTrump] = useState<TrumpMode | null>(null);
  return (
    <section className="absolute inset-x-0 bottom-0 z-20 px-0 pb-1" data-id="action-area">
      <BiddingStatus view={view} onBid={onBid} onSuitChange={setPreviewTrump} />
      <HandFan
        hand={view.myHand}
        trump={view.trump ?? previewTrump}
        legalSet={legalSet}
        myTurnToPlay={myTurnToPlay}
        busy={busy}
        preSelected={preSelected}
        onCardClick={onCardClick}
      />
    </section>
  );
}

function BiddingStatus({
  view,
  onBid,
  onSuitChange,
}: {
  view: PlayerView;
  onBid: (payload: BidPayload) => Promise<void> | void;
  onSuitChange: (suit: TrumpMode | null) => void;
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
      <BiddingPanel options={view.bidOptions} onBid={onBid} onSuitChange={onSuitChange} />
    </div>
  );
}
