"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlayerView } from "@/lib/bouilla";
import type { GameView, NextDealGate } from "@/lib/server/view";
import { ROUND_LABEL_FR } from "./bouillaLabels";
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
  const seats = [0, 1, 2, 3];

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-overlay)] px-6" data-id="bouilla-round-overlay">
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--surface)] p-6 text-center text-[var(--card-face)] ring-1 ring-[var(--accent-cyan)]/30">
        {finished ? (
          <>
            <h2 className="text-2xl font-black text-[var(--accent-yellow)]" data-id="bouilla-winner">
              {iAmWinner ? "Vous gagnez !" : "Partie terminée"}
            </h2>
            <p className="mt-2 text-sm text-[var(--card-face)]/80">
              {view.winners && view.winners.length > 0
                ? `Vainqueur${view.winners.length > 1 ? "s" : ""} : ${view.winners.map((s) => playerName(gv, s)).join(", ")}`
                : ""}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {seats.map((seat) => (
                <div key={seat} className="rounded-lg bg-[rgba(255,250,242,0.12)] py-2 px-2" data-id={`bouilla-final-score-${seat}`}>
                  <p className="text-xs text-[var(--card-face)]/65">{playerName(gv, seat)}</p>
                  <p className="text-lg font-bold">{view.totalScores[seat]}</p>
                </div>
              ))}
            </div>
            <Link
              href="/"
              data-id="finished-home-button"
              className="mt-5 inline-block rounded-lg bg-[var(--accent-yellow)] px-5 py-2.5 font-bold text-[var(--surface)]"
            >
              Nouvelle partie
            </Link>
          </>
        ) : (
          result && (
            <>
              <h2 className="text-2xl font-black text-[var(--accent-cyan)]" data-id="bouilla-round-result-title">
                {ROUND_LABEL_FR[result.round]}
              </h2>
              {result.sweepSeat !== undefined && (
                <p className="mt-1 text-sm font-bold text-[var(--accent-yellow)]" data-id="bouilla-round-capot">
                  Capot ! {playerName(gv, result.sweepSeat)} a tout raflé — tout le monde d&apos;autre prend le maximum.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {seats.map((seat) => (
                  <div key={seat} className="rounded-lg bg-[rgba(255,250,242,0.12)] py-2 px-2" data-id={`bouilla-round-score-${seat}`}>
                    <p className="text-xs text-[var(--card-face)]/65">{playerName(gv, seat)}</p>
                    <p className="text-lg font-bold">+{result.penalties[seat]}</p>
                    <p className="text-xs text-[var(--card-face)]/65">total {view.totalScores[seat]}</p>
                  </div>
                ))}
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
                  ? `En attente des joueurs (${nextRoundGate.readyCount}/${nextRoundGate.humanCount})`
                  : "Manche suivante"}
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}
