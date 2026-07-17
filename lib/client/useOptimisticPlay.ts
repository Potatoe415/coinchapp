"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface OptimisticPlayView<TCard> {
  phase: string;
  turn: number;
  myHand: TCard[];
  legalCards: TCard[];
  currentTrick: { cards: { seat: number; card: TCard }[] };
  lastTrick: { cards: { seat: number; card: TCard }[] } | null;
}

export interface UseOptimisticPlayResult<TCard> {
  busy: boolean;
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  /** Hand with the just-tapped card already removed, so it disappears the instant
   *  the player taps it instead of waiting for the server round trip. */
  optimisticHand: TCard[];
  /** Current trick's cards, with the just-tapped card appended if the server
   *  hasn't echoed it back into `view.currentTrick` yet. */
  trickCards: { seat: number; card: TCard }[];
  /** Submit a play: reflects it in `optimisticHand`/`trickCards` immediately, then
   *  awaits the real submit (rolling back on failure). Safe to call unconditionally -
   *  no-ops if it isn't legal or another play is already in flight. Stable identity,
   *  so it is safe to use directly inside timers/effects. */
  play: (card: TCard) => Promise<void>;
  /** Card id staged while waiting for this seat's turn (see `tapCard`), or null. */
  preSelectedId: string | null;
  /** Tap a card: plays it immediately if it's my turn; otherwise stages it as a
   *  pre-selection (tapping the same card again clears it). A pre-selected card
   *  auto-plays the instant it becomes my turn, as long as it is still legal then. */
  tapCard: (card: TCard) => void;
}

type PendingCard<TCard> = { seat: number; card: TCard };

/** True once the server view has echoed the pending play back (into the current or
 *  just-finished trick) and it has left the hand - the optimistic guess can retire. */
function isPendingConfirmed<TCard>(
  view: OptimisticPlayView<TCard>,
  pending: PendingCard<TCard>,
  cardId: (card: TCard) => string,
): boolean {
  const id = cardId(pending.card);
  const seenInTrick = (cards: { seat: number; card: TCard }[]) =>
    cards.some((played) => played.seat === pending.seat && cardId(played.card) === id);
  const stillInHand = view.myHand.some((card) => cardId(card) === id);
  const seen = seenInTrick(view.currentTrick.cards) || (view.lastTrick ? seenInTrick(view.lastTrick.cards) : false);
  return seen && !stillInHand;
}

/** The current trick's cards, with the pending optimistic play appended if the
 *  server hasn't echoed it back yet (and it hasn't just rolled over into lastTrick). */
function mergeTrickCards<TCard>(
  view: OptimisticPlayView<TCard>,
  pending: PendingCard<TCard> | null,
  cardId: (card: TCard) => string,
): { seat: number; card: TCard }[] {
  const cards = [...view.currentTrick.cards];
  if (!pending) return cards;
  const id = cardId(pending.card);
  const inLastTrick = view.lastTrick?.cards.some((c) => c.seat === pending.seat && cardId(c.card) === id) ?? false;
  const inCurrentTrick = cards.some((played) => played.seat === pending.seat);
  if (!inLastTrick && !inCurrentTrick) cards.push(pending);
  return cards;
}

/** Auto-plays the very last card in hand after a short delay, same UX every game
 *  uses for a forced final card. Pass `null` to opt a game out of this behavior. */
function useAutoPlayLastCard<TCard>(
  view: OptimisticPlayView<TCard>,
  myTurnToPlay: boolean,
  busy: boolean,
  handCount: number,
  delayMs: number | null,
  play: (card: TCard) => void,
): void {
  useEffect(() => {
    if (delayMs === null || !myTurnToPlay || busy || handCount !== 1) return;
    const card = view.myHand[0];
    const timer = window.setTimeout(() => play(card), delayMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurnToPlay, busy, handCount, delayMs]);
}

/** Auto-plays a still-legal pre-selected card the instant it becomes my turn.
 *  Skipped when there is only one card left: `useAutoPlayLastCard` already
 *  handles that case, regardless of any pre-selection. */
function useAutoPlayPreSelected<TCard>(
  view: OptimisticPlayView<TCard>,
  myTurnToPlay: boolean,
  busy: boolean,
  handCount: number,
  preSelectedId: string | null,
  legalSet: Set<string>,
  cardId: (card: TCard) => string,
  play: (card: TCard) => void,
): void {
  useEffect(() => {
    if (!myTurnToPlay || busy || preSelectedId === null || handCount === 1) return;
    const card = view.myHand.find((c) => cardId(c) === preSelectedId);
    if (card && legalSet.has(preSelectedId)) play(card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurnToPlay, busy]);
}

/**
 * Shared "instant feedback" for playing a card online/ad-hoc, where every play is a
 * network round trip (server action + realtime refetch) that can take 1-2s. Without
 * this, the tapped card visibly sits in hand until that round trip resolves. Also
 * covers pre-selecting a card while waiting for one's turn (auto-played once legal,
 * dropped if it stops being legal). Plug in the game's own `cardId` and submit
 * function; every trick-taking table (Coinche's `GameTable`, Bouilla's `BouillaTable`,
 * and any future game) gets the same UX from this one place - do not re-implement
 * this per game.
 */
export function useOptimisticPlay<TCard>(
  view: OptimisticPlayView<TCard>,
  mySeat: number,
  cardId: (card: TCard) => string,
  onPlay: (card: TCard) => Promise<void> | void,
  options?: { autoPlayLastCardDelayMs?: number | null },
): UseOptimisticPlayResult<TCard> {
  const [busy, setBusy] = useState(false);
  const [pendingPlayed, setPendingPlayed] = useState<PendingCard<TCard> | null>(null);
  const [preSelectedId, setPreSelectedId] = useState<string | null>(null);

  const legalSet = new Set(view.legalCards.map(cardId));
  const myTurnToPlay = view.phase === "playing" && view.turn === mySeat;
  const handCount = view.myHand.length;
  const optimisticHand =
    pendingPlayed && pendingPlayed.seat === mySeat
      ? view.myHand.filter((card) => cardId(card) !== cardId(pendingPlayed.card))
      : view.myHand;

  async function play(card: TCard) {
    if (!myTurnToPlay || !legalSet.has(cardId(card)) || busy) return;
    setBusy(true);
    setPendingPlayed({ seat: mySeat, card });
    try {
      await onPlay(card);
    } catch {
      setPendingPlayed(null);
    } finally {
      setBusy(false);
    }
  }

  // Stable identity so timers/effects (here and in callers) always reach the
  // latest `play` closure without each needing their own ref.
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });
  const stablePlay = useCallback((card: TCard) => playRef.current(card), []);

  function tapCard(card: TCard) {
    if (myTurnToPlay) {
      setPreSelectedId(null);
      void stablePlay(card);
      return;
    }
    if (view.phase !== "playing") return;
    const id = cardId(card);
    setPreSelectedId((prev) => (prev === id ? null : id));
  }

  // Drop a pre-selection that is no longer legal now that it is our turn.
  if (myTurnToPlay && preSelectedId !== null && !legalSet.has(preSelectedId)) setPreSelectedId(null);
  if (pendingPlayed && isPendingConfirmed(view, pendingPlayed, cardId)) setPendingPlayed(null);

  const trickCards = mergeTrickCards(view, pendingPlayed, cardId);
  useAutoPlayLastCard(view, myTurnToPlay, busy, handCount, options?.autoPlayLastCardDelayMs ?? 700, stablePlay);
  useAutoPlayPreSelected(view, myTurnToPlay, busy, handCount, preSelectedId, legalSet, cardId, stablePlay);

  return { busy, legalSet, myTurnToPlay, optimisticHand, trickCards, play: stablePlay, preSelectedId, tapCard };
}
