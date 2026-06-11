"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { CAPOT_VALUE, cardId, GENERALE_VALUE, isTrump, RANKS, teamOf, trumpStrength, type Bid, type Card, type PlayedCard, type PlayerView, type TrumpMode } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import { BiddingPanel, type BidPayload, type CurrentLiveBid } from "./BiddingPanel";
import { EmojiButton, type EmojiReaction } from "./EmojiButton";
import { GameHud } from "./GameHud";
import { GameTableScene } from "./GameTableScene";
import { playerName, relativeSeat } from "./gameTableHelpers";
import { isRedSuit, trumpModeLabel } from "./labels";
import { PlayingCard } from "./PlayingCard";

export interface GameActions {
  onBid: (payload: BidPayload) => Promise<void> | void;
  onPlay: (card: Card) => Promise<void> | void;
  onNextDeal: () => Promise<void> | void;
  /** Online only: take over running the bots. */
  onBecomeHost?: () => Promise<void> | void;
  /** Local only: restart the game from scratch with same settings. */
  onReset?: () => void;
  /** Local only: re-deal the current hand (no card played yet). */
  onReshuffle?: () => void;
  /** Send an emoji reaction visible to all players. */
  onSendEmoji?: (emoji: string) => void;
}

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 };

/**
 * Two triggers — both require the first card to be a non-trump Ace:
 *   A) 2nd card is a trump  → BIM fires immediately (trickCards.length === 2)
 *   B) 4th card is a trump AND cards 2 & 3 were not trumps → BIM at the last card
 * Any other configuration never fires (c'est tout).
 */
function computeBimKey(
  view: { trump: import("@/lib/coinche").TrumpMode | null; tricks: import("@/lib/coinche").Trick[] },
  trickCards: PlayedCard[],
): string | null {
  const { trump, tricks } = view;
  if (!trump || trump === "SA" || trump === "TA") return null;
  if (trickCards.length < 2) return null;
  const first = trickCards[0];
  if (first.card.rank !== "A" || isTrump(first.card, trump)) return null;
  const n = trickCards.length;
  const idx = tricks.length;
  // Trigger A: 2nd card immediately cuts the Ace
  if (n === 2 && isTrump(trickCards[1].card, trump)) {
    const c = trickCards[1];
    return `${idx}:a:${c.seat}:${cardId(c.card)}`;
  }
  // Trigger B: 4th card cuts the Ace (cards 2 and 3 were not trumps)
  if (
    n === 4 &&
    !isTrump(trickCards[1].card, trump) &&
    !isTrump(trickCards[2].card, trump) &&
    isTrump(trickCards[3].card, trump)
  ) {
    const c = trickCards[3];
    return `${idx}:b:${c.seat}:${cardId(c.card)}`;
  }
  return null;
}

function deriveLiveBid(bids: Bid[]): { bid: Bid; coinched: boolean; surcoinched: boolean } | null {
  let highest: Bid | undefined;
  let coinched = false;
  let surcoinched = false;
  for (const b of bids) {
    if (b.type === "bid") {
      highest = b;
      coinched = false;
      surcoinched = false;
    } else if (b.type === "coinche") {
      coinched = true;
    } else if (b.type === "surcoinche") {
      surcoinched = true;
    }
  }
  if (!highest) return null;
  return { bid: highest, coinched, surcoinched };
}

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

export function GameTable({ gv, actions, reactions }: { gv: GameView; actions: GameActions; reactions?: Map<number, EmojiReaction> }) {
  const view = gv.view!;
  const mySeat = gv.mySeat!;
  const [busy, setBusy] = useState(false);
  const [pendingPlayed, setPendingPlayed] = useState<PendingPlayedCard | null>(null);
  const [preSelected, setPreSelected] = useState<string | null>(null);
  const [emojiOn, setEmojiOn] = useState(true);

  useEffect(() => {
    // Post-hydration browser read: deferred to after mount to avoid an SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem("coinchapp-emoji") === "false") setEmojiOn(false);
  }, []);

  function toggleEmoji() {
    setEmojiOn((v) => {
      localStorage.setItem("coinchapp-emoji", String(!v));
      return !v;
    });
  }
  const legalSet = new Set(view.legalCards.map(cardId));
  const myTurnToPlay = view.phase === "playing" && view.turn === mySeat;
  const pendingCardId = pendingPlayed ? cardId(pendingPlayed.card) : null;
  const optimisticHand =
    pendingPlayed && pendingPlayed.seat === mySeat
      ? view.myHand.filter((card) => cardId(card) !== pendingCardId)
      : view.myHand;
  const handCount = view.myHand.length;

  async function onPlay(card: Card) {
    if (!myTurnToPlay || !legalSet.has(cardId(card)) || busy) return;
    setPreSelected(null);
    setBusy(true);
    setPendingPlayed({ seat: mySeat, card });
    try {
      await actions.onPlay(card);
    } catch {
      setPendingPlayed(null);
    } finally {
      setBusy(false);
    }
  }

  // Keep a ref to the latest onPlay so timeout/turn-driven auto-play uses fresh state.
  const onPlayRef = useRef<(card: Card) => Promise<void>>(async () => {});
  useEffect(() => {
    onPlayRef.current = onPlay;
  });

  // Clear the optimistic pending card once the server view reflects the play.
  if (pendingPlayed) {
    const inCurrentTrick = view.currentTrick.cards.some(
      (played) => played.seat === pendingPlayed.seat && cardId(played.card) === pendingCardId,
    );
    const inLastTrick =
      view.lastTrick?.cards.some(
        (played) => played.seat === pendingPlayed.seat && cardId(played.card) === pendingCardId,
      ) ?? false;
    const stillInHand = view.myHand.some((card) => cardId(card) === pendingCardId);
    if ((inCurrentTrick || inLastTrick) && !stillInHand) setPendingPlayed(null);
  }

  // Drop a pre-selection that is no longer legal now that it is our turn.
  if (myTurnToPlay && preSelected !== null && !legalSet.has(preSelected)) {
    setPreSelected(null);
  }

  // Auto-play only when it's the very last card in hand.
  useEffect(() => {
    if (!myTurnToPlay || busy || handCount !== 1) return;
    const card = view.myHand[0];
    const timer = window.setTimeout(() => void onPlayRef.current(card), 700);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurnToPlay, busy, handCount]);

  // Auto-play a legal pre-selected card when it becomes our turn.
  useEffect(() => {
    if (!myTurnToPlay || busy || preSelected === null || handCount === 1) return;
    const card = view.myHand.find((c) => cardId(c) === preSelected);
    if (card && legalSet.has(preSelected)) void onPlayRef.current(card);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurnToPlay, busy]);
  const seats = {
    top: relativeSeat(mySeat, 2),
    left: relativeSeat(mySeat, 3),
    right: relativeSeat(mySeat, 1),
    bottom: mySeat,
  };
  const trickCards = [...view.currentTrick.cards];
  const pendingInLastTrick =
    pendingPlayed !== null &&
    (view.lastTrick?.cards.some((c) => c.seat === pendingPlayed.seat && cardId(c.card) === pendingCardId) ?? false);
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
  const bimTrickKey = computeBimKey(view, trickCards);

  function onCardClick(card: Card) {
    if (myTurnToPlay) {
      if (!busy) void onPlay(card);
    } else if (view.phase === "playing") {
      // Pre-selection is always allowed (even while bots are playing).
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
        infoCode={gv.roomCode}
        onReset={actions.onReset}
        onReshuffle={actions.onReshuffle}
        emojiControls={actions.onSendEmoji ? { enabled: emojiOn, onToggle: toggleEmoji } : undefined}
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
          bimTrickKey={bimTrickKey}
          reactions={reactions}
          onNextDeal={actions.onNextDeal}
        />
        {emojiOn && actions.onSendEmoji && (
          <EmojiButton
            myReaction={reactions?.get(mySeat)}
            onSelect={actions.onSendEmoji}
          />
        )}
        <ActionDock
          view={view}
          hand={optimisticHand}
          players={gv.players}
          mySeat={mySeat}
          legalSet={legalSet}
          myTurnToPlay={myTurnToPlay}
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
  preSelected,
  onCardClick,
}: {
  hand: Card[];
  trump: TrumpMode | null;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
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
  isPreSelected,
  onCardClick,
}: {
  card: Card;
  index: number;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  isPreSelected: boolean;
  onCardClick: (card: Card) => void;
}) {
  const isPlayable = myTurnToPlay && legalSet.has(cardId(card));
  const isDimmed = myTurnToPlay && !legalSet.has(cardId(card));
  // Keep the hand visually stable while playing online: only explicit pre-selection lifts a card.
  const lift = isPreSelected ? "translateY(-28px)" : "none";

  // When it's my turn: let PlayingCard render a <button> and handle the click.
  // When it's not my turn (pre-selection mode): PlayingCard renders a <div> (no onClick →
  // not disabled), and the outer div captures the click.
  const playCardClick = myTurnToPlay ? () => onCardClick(card) : undefined;
  const preselectClick = !myTurnToPlay ? () => onCardClick(card) : undefined;

  return (
    <div
      className="absolute bottom-0 transition-transform duration-150"
      style={{ left: index * HAND_STEP, zIndex: isPreSelected ? 60 + index : isPlayable ? 50 + index : index, transform: lift }}
      onClick={preselectClick}
    >
      <div className={isPreSelected ? "rounded-lg ring-2 ring-[var(--accent-yellow)]" : undefined}>
        <PlayingCard
          card={card}
          size="lg"
          dataId={`hand-card-${cardId(card)}`}
          playable={isPlayable}
          dimmed={isDimmed}
          onClick={playCardClick}
        />
      </div>
    </div>
  );
}

function ActionDock({
  view,
  hand,
  players,
  mySeat,
  legalSet,
  myTurnToPlay,
  preSelected,
  onBid,
  onCardClick,
}: {
  view: PlayerView;
  hand: Card[];
  players?: GameView["players"];
  mySeat: number;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  preSelected: string | null;
  onBid: (payload: BidPayload) => Promise<void> | void;
  onCardClick: (card: Card) => void;
}) {
  const [previewTrump, setPreviewTrump] = useState<TrumpMode | null>(null);
  return (
    <section className="absolute inset-x-0 bottom-0 z-20 px-0 pb-1" data-id="action-area">
      <BiddingStatus view={view} players={players} mySeat={mySeat} onBid={onBid} onSuitChange={setPreviewTrump} />
      <HandFan
        hand={hand}
        trump={view.trump ?? previewTrump}
        legalSet={legalSet}
        myTurnToPlay={myTurnToPlay}
        preSelected={preSelected}
        onCardClick={onCardClick}
      />
    </section>
  );
}

function BiddingStatus({
  view,
  players,
  mySeat,
  onBid,
  onSuitChange,
}: {
  view: PlayerView;
  players?: GameView["players"];
  mySeat: number;
  onBid: (payload: BidPayload) => Promise<void> | void;
  onSuitChange: (suit: TrumpMode | null) => void;
}) {
  const { locale } = useI18n();
  if (view.phase !== "bidding") return null;
  if (!view.bidOptions) return null;
  const derived = deriveLiveBid(view.bids);
  const currentLiveBid: CurrentLiveBid | null = derived
    ? {
        label: `${derived.bid.value} ${trumpModeLabel(derived.bid.suit!, locale)}${derived.surcoinched ? " ×4" : derived.coinched ? " ×2" : ""}`,
        isRed:
          derived.bid.suit !== undefined &&
          derived.bid.suit !== "TA" &&
          derived.bid.suit !== "SA" &&
          isRedSuit(derived.bid.suit),
        bidderName:
          derived.bid.seat === mySeat
            ? "Toi"
            : (players?.find((player) => player.seat === derived.bid.seat)?.displayName ?? null),
        bidderTeam: teamOf(derived.bid.seat),
      }
    : null;
  return (
    <div className="mx-3 mb-2 rounded-2xl bg-[var(--surface-overlay)] p-3 shadow-xl" data-id="bidding-status-panel">
      <BidHistory bids={view.bids} players={players} mySeat={mySeat} />
      <BiddingPanel options={view.bidOptions} currentLiveBid={currentLiveBid} onBid={onBid} onSuitChange={onSuitChange} />
    </div>
  );
}

function BidHistory({
  bids,
  players,
  mySeat,
}: {
  bids: Bid[];
  players?: GameView["players"];
  mySeat: number;
}) {
  const { locale } = useI18n();
  if (bids.length === 0) return null;
  return (
    <div className="mb-2 max-h-24 overflow-y-auto" data-id="bid-history">
      {bids.map((bid, i) => {
        const isMe = bid.seat === mySeat;
        const name = isMe
          ? "Toi"
          : (players?.find((p) => p.seat === bid.seat)?.displayName ?? `J${bid.seat + 1}`);
        const teamColor = teamOf(bid.seat) === "A" ? "var(--team-a)" : "var(--team-b)";
        let label: string;
        let labelClass: string;
        if (bid.type === "pass") {
          label = "Passe";
          labelClass = "text-[var(--card-face)]/40";
        } else if (bid.type === "bid") {
          const isRed = bid.suit === "H" || bid.suit === "D";
          const val = bid.value === CAPOT_VALUE ? "Capot" : bid.value === GENERALE_VALUE ? "Générale" : String(bid.value);
          label = `${val}${bid.suit ? ` ${trumpModeLabel(bid.suit, locale)}` : ""}`;
          labelClass = `font-bold ${isRed ? "text-[var(--accent-red)]" : "text-[var(--card-face)]"}`;
        } else if (bid.type === "coinche") {
          label = "Coinche";
          labelClass = "font-bold text-[var(--accent-yellow)]";
        } else {
          label = "Surcoinche";
          labelClass = "font-bold text-[var(--accent-red)]";
        }
        return (
          <div key={i} className="flex items-center justify-between gap-2 px-1 py-0.5" data-id={`bid-history-row-${i}`}>
            <span className="text-xs font-bold" style={{ color: teamColor }}>{name}</span>
            <span className={`text-xs ${labelClass}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
