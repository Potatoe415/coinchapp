"use client";

import type { PlayerView, Titles } from "@/lib/president";
import { useI18n } from "@/lib/client/i18n";
import type { GameView } from "@/lib/server/view";
import { playerName } from "./gameTableHelpers";
import { TITLE_SHORT_LABEL } from "./presidentLabels";

const TITLE_ORDER: Titles[number][] = ["president", "vicePresident", "viceTrouDuCul", "trouDuCul"];

function rankFor(titles: Titles, seat: number): number {
  return TITLE_ORDER.indexOf(titles[seat]) + 1;
}

/** Rounds x seats ranking table. Reusable inline or inside the overlay. */
export function PresidentScoreTable({ gv, view }: { gv: GameView; view: PlayerView }) {
  const { locale, t } = useI18n();
  const seats = [0, 1, 2, 3];
  const resultByRound = new Map(view.roundHistory.map((r) => [r.roundIndex, r]));
  const lastRoundIndex = view.lastRoundResult?.roundIndex;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-id="president-scoreboard-table">
          <thead>
            <tr className="text-left text-[var(--card-face)]/60">
              <th className="py-1 pr-2 font-semibold">{t("round")}</th>
              {seats.map((seat) => (
                <th key={seat} className="px-1 py-1 text-center font-semibold" data-id={`president-scoreboard-header-${seat}`}>
                  {playerName(gv, seat, locale)}
                  {seat === view.mySeat && ` (${t("you")})`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: view.roundsToPlay }, (_, roundIndex) => {
              const result = resultByRound.get(roundIndex);
              const isCurrent = roundIndex === view.roundIndex && view.phase !== "finished" && !result;
              const isLastCompleted = roundIndex === lastRoundIndex;
              return (
                <tr
                  key={roundIndex}
                  className={`border-t border-[var(--card-face)]/10 ${isLastCompleted ? "bg-[var(--accent-cyan)]/10" : ""}`}
                  data-id={`president-scoreboard-row-${roundIndex}`}
                >
                  <td className={`py-1.5 pr-2 font-medium ${isCurrent ? "text-[var(--accent-cyan)]" : "text-[var(--card-face)]/80"}`}>
                    {t("round")} {roundIndex + 1}
                  </td>
                  {seats.map((seat) => (
                    <td
                      key={seat}
                      className="px-1 py-1.5 text-center text-[var(--card-face)]/80"
                      data-id={`president-scoreboard-cell-${roundIndex}-${seat}`}
                    >
                      {result ? rankFor(result.titles, seat) : isCurrent ? "…" : "—"}
                      {result && (
                        <span className="block text-[0.6rem] font-normal text-[var(--card-face)]/50">
                          {TITLE_SHORT_LABEL[locale][result.titles[seat]]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t-2 border-[var(--card-face)]/25 font-black" data-id="president-scoreboard-total-row">
              <td className="py-2 pr-2 text-[var(--card-face)]">{t("total")}</td>
              {seats.map((seat) => (
                <td key={seat} className="px-1 py-2 text-center text-[var(--card-face)]" data-id={`president-scoreboard-total-${seat}`}>
                  {view.totalScores[seat]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-xs text-[var(--card-face)]/60">{t("lowestScoreWins")}</p>
    </>
  );
}

/** Rounds x seats ranking table shown as a dismissible overlay panel. */
export function PresidentScoreboard({ gv, view, onClose }: { gv: GameView; view: PlayerView; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4" data-id="president-scoreboard-overlay" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-4 shadow-2xl"
        data-id="president-scoreboard-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-[var(--card-face)]">{t("scoreboard")}</h2>
          <button
            data-id="president-scoreboard-close"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-lg px-3 py-1 text-sm font-medium text-[var(--card-face)]/60 hover:text-[var(--card-face)]"
          >
            ✕
          </button>
        </div>
        <PresidentScoreTable gv={gv} view={view} />
      </div>
    </div>
  );
}
