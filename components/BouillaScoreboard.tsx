"use client";

import { ROUND_ORDER, type PlayerView } from "@/lib/bouilla";
import type { GameView } from "@/lib/server/view";
import { ROUND_LABEL_FR } from "./bouillaLabels";
import { playerName } from "./gameTableHelpers";

/** Rounds (rows) x seats (columns) penalty table, the natural scoreboard for this
 *  golf-style game (least points wins), shown as a toggle-able overlay panel. */
export function BouillaScoreboard({
  gv,
  view,
  onClose,
}: {
  gv: GameView;
  view: PlayerView;
  onClose: () => void;
}) {
  const seats = [0, 1, 2, 3];
  const resultByRound = new Map(view.roundHistory.map((r) => [r.round, r]));

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
      data-id="bouilla-scoreboard-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-4 shadow-2xl"
        data-id="bouilla-scoreboard-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-[var(--card-face)]">Tableau des scores</h2>
          <button
            data-id="bouilla-scoreboard-close"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-[var(--card-face)]/60 hover:text-[var(--card-face)]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-id="bouilla-scoreboard-table">
            <thead>
              <tr className="text-left text-[var(--card-face)]/60">
                <th className="py-1 pr-2 font-semibold">Manche</th>
                {seats.map((seat) => (
                  <th key={seat} className="px-1 py-1 text-center font-semibold" data-id={`scoreboard-header-${seat}`}>
                    {playerName(gv, seat)}
                    {seat === view.mySeat && " (vous)"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROUND_ORDER.map((round, index) => {
                const result = resultByRound.get(round);
                const isCurrent = index === view.roundIndex && view.phase !== "finished" && !result;
                return (
                  <tr key={round} className="border-t border-[var(--card-face)]/10" data-id={`scoreboard-row-${round}`}>
                    <td className={`py-1.5 pr-2 font-medium ${isCurrent ? "text-[var(--accent-cyan)]" : "text-[var(--card-face)]/80"}`}>
                      {ROUND_LABEL_FR[round]}
                      {result?.sweepSeat !== undefined && (
                        <span className="block text-[0.65rem] font-normal text-[var(--accent-yellow)]" data-id={`scoreboard-capot-${round}`}>
                          Capot ({playerName(gv, result.sweepSeat)})
                        </span>
                      )}
                    </td>
                    {seats.map((seat) => (
                      <td key={seat} className="px-1 py-1.5 text-center text-[var(--card-face)]/80" data-id={`scoreboard-cell-${round}-${seat}`}>
                        {result ? result.penalties[seat] : isCurrent ? "…" : "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[var(--card-face)]/25 font-black" data-id="scoreboard-total-row">
                <td className="py-2 pr-2 text-[var(--card-face)]">Total</td>
                {seats.map((seat) => (
                  <td key={seat} className="px-1 py-2 text-center text-[var(--card-face)]" data-id={`scoreboard-total-${seat}`}>
                    {view.totalScores[seat]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--card-face)]/60">Le moins de points gagne.</p>
      </div>
    </div>
  );
}
