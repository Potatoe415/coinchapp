"use client";

import Link from "next/link";
import { useState } from "react";
import { formatText, useI18n } from "@/lib/client/i18n";
import type { PlayerView } from "@/lib/coinche";
import { formatContract } from "./labels";

export function DealOverlay({
  view,
  onNextDeal,
}: {
  view: PlayerView;
  onNextDeal: () => Promise<void> | void;
}) {
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const result = view.lastDeal;
  const finished = view.phase === "finished";
  if (!result && !finished) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--surface-overlay)] px-6" data-id="deal-overlay">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-6 text-center text-[var(--card-face)] ring-1 ring-[var(--accent-cyan)]/30">
        {finished ? (
          <>
            <h2 className="text-2xl font-black text-[var(--accent-yellow)]" data-id="game-winner">
              {formatText(t("winnerTeam"), { team: view.winner ?? "" })}
            </h2>
            <p className="mt-2 text-[var(--card-face)]/80">
              {formatText(t("finalScore"), { a: view.scores.A, b: view.scores.B })}
            </p>
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
              <h2 className="text-xl font-black">{t("endOfDeal")}</h2>
              <p className="mt-1 text-sm text-[var(--card-face)]/70">
                {formatText(t("contractByTeam"), {
                  contract: formatContract(result.contract, locale),
                  team: result.contract.team,
                })}
              </p>
              <p className={`mt-2 font-bold ${result.contractMade ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                {result.contractMade ? t("contractMade") : t("contractFailed")}
                {result.capot && ` · ${t("capot")}`}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <ScoreCell team="A" gained={result.gained.A} total={view.scores.A} />
                <ScoreCell team="B" gained={result.gained.B} total={view.scores.B} />
              </div>
              <button
                data-id="next-deal-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onNextDeal();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-5 w-full rounded-lg bg-[var(--accent-cyan)] px-5 py-2.5 font-bold text-[var(--surface)] disabled:opacity-50"
              >
                {t("nextDeal")}
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}

function ScoreCell({ team, gained, total }: { team: "A" | "B"; gained: number; total: number }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg bg-[rgba(255,250,242,0.12)] py-2" data-id={`deal-score-${team}`}>
      <p className="text-xs text-[var(--card-face)]/65">{t("team")} {team}</p>
      <p className="text-lg font-bold">+{gained}</p>
      <p className="text-xs text-[var(--card-face)]/65">{t("total")} {total}</p>
    </div>
  );
}
