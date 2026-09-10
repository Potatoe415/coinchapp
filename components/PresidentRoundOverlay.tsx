"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlayerView } from "@/lib/president";
import { formatText, useI18n } from "@/lib/client/i18n";
import type { GameView, NextDealGate } from "@/lib/server/view";
import { playerName } from "./gameTableHelpers";
import { PresidentScoreTable } from "./PresidentScoreboard";
import { TITLE_LABEL } from "./presidentLabels";

export function PresidentRoundOverlay({
  gv,
  view,
  visible,
  onNextRound,
  nextRoundGate,
  onRematch,
}: {
  gv: GameView;
  view: PlayerView;
  /** Delayed past the finish-order pause - see `useDelayedVisible`. */
  visible: boolean;
  onNextRound: () => Promise<void> | void;
  nextRoundGate?: NextDealGate;
  /** Online only: from the finished screen, start a fresh match in the same room. */
  onRematch?: () => Promise<void> | void;
}) {
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);
  const result = view.lastRoundResult;
  const finished = view.phase === "finished";

  if (!visible) return null;

  const iAmWinner = finished && !!view.winners?.includes(view.mySeat);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-overlay)] px-4" data-id="president-round-overlay">
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 text-center text-[var(--card-face)] ring-1 ring-[var(--accent-cyan)]/30">
        {finished ? (
          <>
            <h2 className="text-2xl font-black text-[var(--accent-yellow)]" data-id="president-winner">
              {iAmWinner ? t("youWin") : t("gameFinished")}
            </h2>
            <p className="mt-1 text-sm text-[var(--card-face)]/80">
              {view.winners && view.winners.length > 0
                ? `${t(view.winners.length > 1 ? "winners" : "winner")} : ${view.winners.map((s) => playerName(gv, s, locale)).join(", ")}`
                : ""}
            </p>
            <div className="mt-4 text-left">
              <PresidentScoreTable gv={gv} view={view} />
            </div>
            {onRematch && (
              <button
                data-id="president-finished-rematch-button"
                disabled={rematchBusy}
                onClick={async () => {
                  setRematchBusy(true);
                  try {
                    await onRematch();
                  } finally {
                    setRematchBusy(false);
                  }
                }}
                className="mt-5 w-full rounded-lg bg-[var(--accent-cyan)] px-5 py-2.5 font-bold text-[var(--surface)] disabled:opacity-50"
              >
                {t("newGame")}
              </button>
            )}
            <Link
              href="/"
              data-id="president-finished-home-button"
              className="mt-3 inline-block rounded-lg bg-[var(--accent-yellow)] px-5 py-2.5 font-bold text-[var(--surface)]"
            >
              {t("backHome")}
            </Link>
          </>
        ) : (
          result && (
            <>
              <h2 className="text-2xl font-black text-[var(--accent-cyan)]" data-id="president-round-result-title">
                {t("round")} {result.roundIndex + 1}
              </h2>
              <ul className="mt-3 space-y-1 text-left text-sm" data-id="president-finish-order">
                {result.finishedOrder.map((seat, i) => (
                  <li key={seat} className="flex items-center justify-between" data-id={`president-finish-row-${i}`}>
                    <span>
                      {i + 1}. {playerName(gv, seat, locale)}
                    </span>
                    <span className="font-bold text-[var(--accent-cyan)]">{TITLE_LABEL[locale][result.titles[seat]]}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-left">
                <PresidentScoreTable gv={gv} view={view} />
              </div>
              <button
                data-id="president-next-round-button"
                disabled={busy || (nextRoundGate?.iAmReady ?? false)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onNextRound();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-5 w-full rounded-lg bg-[var(--accent-cyan)] px-5 py-2.5 font-bold text-[var(--surface)] disabled:opacity-50"
              >
                {nextRoundGate?.iAmReady
                  ? formatText(t("waitingPlayersReady"), { ready: nextRoundGate.readyCount, total: nextRoundGate.humanCount })
                  : t("nextRound")}
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}
