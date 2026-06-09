"use client";

import Link from "next/link";
import { useState } from "react";
import { playCard } from "@/lib/server/actions-game";
import { cardId, RANKS, type Card, type PlayedCard } from "@/lib/coinche";
import type { GameView } from "@/lib/server/view";
import { BiddingPanel } from "./BiddingPanel";
import { DealOverlay } from "./DealOverlay";
import { PlayerBadge } from "./PlayerBadge";
import { PlayingCard } from "./PlayingCard";
import { formatContract } from "./labels";

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 };

function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) =>
    a.suit !== b.suit
      ? SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
      : RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank),
  );
}

export function GameTable({ gv }: { gv: GameView }) {
  const view = gv.view!;
  const mySeat = gv.mySeat!;
  const [busy, setBusy] = useState(false);

  const nameOf = (seat: number) =>
    gv.players.find((p) => p.seat === seat)?.displayName ?? `Siège ${seat + 1}`;
  const trickBySeat = new Map<number, Card>(
    view.currentTrick.cards.map((c: PlayedCard) => [c.seat, c.card]),
  );
  const legalSet = new Set(view.legalCards.map(cardId));
  const myTurnToPlay = view.phase === "playing" && view.turn === mySeat;

  const opponent = (offset: number) => {
    const seat = (mySeat + offset) % 4;
    return (
      <div className="flex flex-col items-center gap-1">
        <PlayerBadge
          dataId={`player-seat-${seat}`}
          name={nameOf(seat)}
          team={seat % 2 === 0 ? "A" : "B"}
          cardCount={view.handCounts[seat]}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
        />
        <PlayedSlot card={trickBySeat.get(seat)} />
      </div>
    );
  };

  async function onPlay(card: Card) {
    if (!myTurnToPlay || !legalSet.has(cardId(card)) || busy) return;
    setBusy(true);
    try {
      await playCard(gv.gameId, card);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col" data-id="game-table">
      <Header gv={gv} />

      <section className="relative flex flex-1 flex-col items-center justify-between bg-felt px-3 py-4">
        <div data-id="table-top">{opponent(2)}</div>
        <div className="flex w-full items-center justify-between">
          <div data-id="table-left">{opponent(3)}</div>
          <TurnBanner who={view.turn === mySeat ? "Vous" : nameOf(view.turn)} mine={view.turn === mySeat} />
          <div data-id="table-right">{opponent(1)}</div>
        </div>
        <PlayedSlot card={trickBySeat.get(mySeat)} dataId="table-my-played" />
        <DealOverlay gameId={gv.gameId} view={view} />
      </section>

      <section className="bg-felt-dark/80 px-3 py-3" data-id="action-area">
        {view.phase === "bidding" && view.bidOptions ? (
          <BiddingPanel gameId={gv.gameId} options={view.bidOptions} />
        ) : view.phase === "bidding" ? (
          <p className="text-center text-sm text-emerald-100/70">Enchères en cours…</p>
        ) : null}

        <div className="mt-2 flex flex-wrap justify-center gap-1" data-id="my-hand">
          {sortHand(view.myHand).map((card) => (
            <PlayingCard
              key={cardId(card)}
              card={card}
              dataId={`hand-card-${cardId(card)}`}
              playable={myTurnToPlay && legalSet.has(cardId(card))}
              dimmed={myTurnToPlay && !legalSet.has(cardId(card))}
              onClick={() => onPlay(card)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function Header({ gv }: { gv: GameView }) {
  const view = gv.view!;
  return (
    <header className="flex items-center justify-between gap-2 bg-felt-dark px-3 py-2 text-sm" data-id="game-header">
      <Link href="/" className="rounded-full bg-white/10 px-3 py-1" data-id="game-back">
        ←
      </Link>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-wider text-emerald-100/50">
          Objectif {view.targetPoints}
        </p>
        <p className="font-bold" data-id="game-contract">
          {view.trump ? `${formatContract(view.contract)}` : "Enchères"}
        </p>
      </div>
      <div className="flex gap-2 font-bold" data-id="game-scores">
        <span style={{ color: "var(--team-a)" }}>{view.scores.A}</span>
        <span className="text-white/30">/</span>
        <span style={{ color: "var(--team-b)" }}>{view.scores.B}</span>
      </div>
    </header>
  );
}

function TurnBanner({ who, mine }: { who: string; mine: boolean }) {
  return (
    <div
      data-id="turn-banner"
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        mine ? "bg-amber-300 text-amber-950" : "bg-black/40 text-emerald-100/80"
      }`}
    >
      {mine ? "À vous" : `Tour : ${who}`}
    </div>
  );
}

function PlayedSlot({ card, dataId }: { card?: Card; dataId?: string }) {
  if (!card) {
    return <div className="h-20 w-14" data-id={dataId} />;
  }
  return <PlayingCard card={card} dataId={dataId} />;
}
