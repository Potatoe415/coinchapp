"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlayerView } from "@/lib/bouilla";
import { formatText, useI18n } from "@/lib/client/i18n";
import type { GameView, NextDealGate } from "@/lib/server/view";
import { BouillaScoreTable } from "./BouillaScoreboard";
import { ROUND_LABEL } from "./bouillaLabels";
import { playerName } from "./gameTableHelpers";

export function BouillaRoundOverlay({
  gv,
  view,
  onNextRound,
  nextRoundGate,
}: {
  gv: GameView;
  view: PlayerView;
  onNextRound: () => Promise<void> | void;
  nextRoundGate?: NextDealGate;
}) {
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const result = view.lastRoundResult;
  const finished = view.phase === "finished";
  const shouldShow = !!result || finished;

  const [visible, setVisible] = useState(false);
  const [prevShouldShow, setPrevShouldShow] = useState(shouldShow);
  if (shouldShow !== prevShouldShow) {
    setPrevShouldShow(shouldShow);
    if (!shouldShow) setVisible(false);
  }
  useEffect(() => {
    if (!shouldShow) return;
    // Longer than the trick-collect animation (1500ms, see TrickStage.tsx) so the
    // last trick's cards finish flying off before the score overlay covers them.
    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, [shouldShow]);

  if (!visible) return null;

  const iAmWinner = finished && !!view.winners?.includes(view.mySeat);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-overlay)] px-4" data-id="bouilla-round-overlay">
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 text-center text-[var(--card-face)] ring-1 ring-[var(--accent-cyan)]/30">
        {finished ? (
          <>
            <h2 className="text-2xl font-black text-[var(--accent-yellow)]" data-id="bouilla-winner">
              {iAmWinner ? t("youWin") : t("gameFinished")}
            </h2>
            <p className="mt-1 text-sm text-[var(--card-face)]/80">
              {view.winners && view.winners.length > 0
                ? `${t(view.winners.length > 1 ? "winners" : "winner")} : ${view.winners.map((s) => playerName(gv, s, locale)).join(", ")}`
                : ""}
            </p>
            <div className="mt-4 text-left">
              <BouillaScoreTable gv={gv} view={view} />
            </div>
            <Link
              href="/"
              data-id="finished-home-button"
              className="mt-5 inline-block rounded-lg bg-[var(--accent-yellow)] px-5 py-2.5 font-bold text-[var(--surface)]"
            >
              {t("newGame")}
            </Link>
          </>
        ) : (
          result && (
            <>
              <h2 className="text-2xl font-black text-[var(--accent-cyan)]" data-id="bouilla-round-result-title">
                {ROUND_LABEL[locale][result.round]}
              </h2>
              {result.sweepSeat !== undefined && (
                <p className="mt-1 text-sm font-bold text-[var(--accent-yellow)]" data-id="bouilla-round-capot">
                  {formatText(t("sweepResult"), { player: playerName(gv, result.sweepSeat, locale) })}
                </p>
              )}
              <div className="mt-4 text-left">
                <BouillaScoreTable gv={gv} view={view} />
              </div>
              <button
                data-id="bouilla-next-round-button"
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
                  ? formatText(t("waitingPlayersReady"), {
                      ready: nextRoundGate.readyCount,
                      total: nextRoundGate.humanCount,
                    })
                  : t("nextRound")}
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}
