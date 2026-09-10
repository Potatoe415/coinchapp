"use client";

import { useState } from "react";
import type { Card, PlayerView } from "@/lib/president";
import { formatText, useI18n } from "@/lib/client/i18n";
import type { GameView } from "@/lib/server/view";
import { playerName } from "./gameTableHelpers";
import { PlayingCard } from "./PlayingCard";

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/** Shown during the "exchange" phase: the awaiting seat (President, then
 *  Vice-President) picks which cards to give back; everyone else just waits. */
export function PresidentExchangePanel({
  gv,
  view,
  onSubmit,
}: {
  gv: GameView;
  view: PlayerView;
  onSubmit: (cards: Card[]) => Promise<void> | void;
}) {
  const { locale, t } = useI18n();
  const [selected, setSelected] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const pending = view.pendingExchange;
  if (!pending) return null;

  const myTurnToReturn = pending.awaiting[0] === view.mySeat;
  const owed = pending.owed[view.mySeat] ?? 0;

  if (!myTurnToReturn) {
    return (
      <div
        className="absolute inset-x-6 top-1/2 z-20 -translate-y-1/2 rounded-2xl bg-[var(--surface-overlay)] p-5 text-center text-[var(--card-face)]"
        data-id="president-exchange-waiting"
      >
        <p className="text-sm">{formatText(t("exchangeWaitingOn"), { player: playerName(gv, pending.awaiting[0], locale) })}</p>
      </div>
    );
  }

  function tapCard(card: Card) {
    const key = cardKey(card);
    setSelected((prev) => {
      if (prev.some((c) => cardKey(c) === key)) return prev.filter((c) => cardKey(c) !== key);
      return prev.length >= owed ? prev : [...prev, card];
    });
  }

  const canConfirm = selected.length === owed;

  return (
    <div
      className="absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl bg-[var(--surface-overlay)] p-5 text-[var(--card-face)]"
      data-id="president-exchange-panel"
    >
      <p className="text-center text-sm font-bold">{formatText(t("exchangeReturnPrompt"), { count: owed })}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2" data-id="president-exchange-hand">
        {view.myHand.map((card) => {
          const key = cardKey(card);
          const isSelected = selected.some((c) => cardKey(c) === key);
          return (
            <div
              key={key}
              className={`transition-transform ${isSelected ? "-translate-y-2 rounded-lg ring-2 ring-[var(--accent-yellow)]" : ""}`}
            >
              <PlayingCard card={card} size="md" dataId={`president-exchange-card-${key}`} playable onClick={() => tapCard(card)} />
            </div>
          );
        })}
      </div>
      <button
        data-id="president-exchange-confirm-button"
        disabled={!canConfirm || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit(selected);
            setSelected([]);
          } finally {
            setBusy(false);
          }
        }}
        className="mt-5 w-full rounded-lg bg-[var(--accent-cyan)] px-5 py-2.5 font-bold text-[var(--surface)] disabled:opacity-50"
      >
        {t("confirmBid")}
      </button>
    </div>
  );
}
