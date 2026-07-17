"use client";

import type { CardOf } from "@/lib/cards";
import { PlayingCard } from "./PlayingCard";

/**
 * One absolutely-positioned card in a hand fan, shared by every game's hand (see
 * `useOptimisticPlay`'s `tapCard`/`preSelectedId`): routes the tap to either play
 * (my turn) or pre-select (waiting for my turn), and gives a pre-selected card the
 * same "lifted + ring" treatment everywhere instead of each game re-styling it.
 */
export function HandCardSlot({
  card,
  left,
  zIndex,
  isPlayable,
  isDimmed,
  isPreSelected,
  myTurnToPlay,
  dataId,
  onTap,
}: {
  card: CardOf<string>;
  left: number;
  zIndex: number;
  isPlayable: boolean;
  isDimmed: boolean;
  isPreSelected: boolean;
  myTurnToPlay: boolean;
  dataId: string;
  onTap: () => void;
}) {
  // Keep the hand visually stable while playing online: only explicit pre-selection lifts a card.
  const lift = isPreSelected ? "translateY(-28px)" : "none";

  // When it's my turn: let PlayingCard render a <button> and handle the click.
  // When it's not my turn (pre-selection mode): PlayingCard renders a <div> (no onClick →
  // not disabled), and the outer div captures the click.
  const playCardClick = myTurnToPlay ? onTap : undefined;
  const preselectClick = !myTurnToPlay ? onTap : undefined;

  return (
    <div
      className="absolute bottom-0 transition-transform duration-150"
      style={{ left, zIndex, transform: lift }}
      onClick={preselectClick}
    >
      <div className={isPreSelected ? "rounded-lg ring-2 ring-[var(--accent-yellow)]" : undefined}>
        <PlayingCard card={card} size="lg" dataId={dataId} playable={isPlayable} dimmed={isDimmed} onClick={playCardClick} />
      </div>
    </div>
  );
}
