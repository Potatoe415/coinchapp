"use client";

import { useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import type { BotTimingEntry } from "@/lib/client/useBotRunner";

/** Above this, a phase is highlighted as the likely culprit for a slow-bot report. */
const SLOW_MS = 1200;

function cell(ms: number | null): string {
  return ms === null ? "—" : `${ms}ms`;
}

function PhaseCell({
  ms,
  serverMs,
  serverLabel,
  label,
}: {
  ms: number | null;
  serverMs?: number | null;
  serverLabel?: string;
  label: string;
}) {
  return (
    <td className={`px-1.5 text-right ${ms !== null && ms > SLOW_MS ? "text-[var(--accent-red)]" : ""}`} title={label}>
      <div>{cell(ms)}</div>
      {serverMs != null && <div className="text-[9px] font-normal text-white/40">{serverMs}{serverLabel}</div>}
    </td>
  );
}

/** CSV download of the full rolling log, for sharing/analysing outside the app. */
function exportLog(log: BotTimingEntry[]) {
  const header = "id,seat,handoffMs,decideMs,submitMs,submitServerMs,refetchMs,refetchServerMs,totalMs";
  const rows = log.map((e) =>
    [e.id, e.seat, e.handoffMs, e.decideMs, e.submitMs, e.submitServerMs, e.refetchMs, e.refetchServerMs, e.totalMs]
      .map((v) => v ?? "")
      .join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bot-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Host-only, in-game floating debug HUD for Bouilla's bot-turn pacing (see
 * `docs/DECISIONS.md`): a small top-right toggle reveals a semi-transparent
 * panel with a live, rolling log of each bot move's timing breakdown
 * (handoff/decide/submit/refetch), sourced from `useBotRunner`'s own
 * measurements. Purely a diagnostic aid, never sent anywhere.
 */
export function BotDebugOverlay({ log }: { log: BotTimingEntry[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        data-id="bot-debug-toggle"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-3 top-3 z-50 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/30 backdrop-blur"
      >
        🐛 {t("botDebugToggle")}
      </button>
      {open && (
        <div
          data-id="bot-debug-panel"
          className="fixed right-3 top-12 z-50 max-h-[70vh] w-[min(94vw,400px)] overflow-y-auto rounded-xl bg-black/75 p-3 text-[11px] font-mono text-white shadow-2xl ring-1 ring-white/20 backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">{t("botDebugTitle")}</p>
            <button
              data-id="bot-debug-export"
              onClick={() => exportLog(log)}
              disabled={log.length === 0}
              className="shrink-0 rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white/80 disabled:opacity-30"
            >
              {t("botDebugExport")}
            </button>
          </div>
          {log.length === 0 ? (
            <p className="text-white/50">{t("botDebugEmpty")}</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-white/50">
                  <th className="text-left">#</th>
                  <th className="px-1.5 text-right">{t("botDebugHandoff")}</th>
                  <th className="px-1.5 text-right">{t("botDebugDecide")}</th>
                  <th className="px-1.5 text-right">{t("botDebugSubmit")}</th>
                  <th className="px-1.5 text-right">{t("botDebugRefetch")}</th>
                  <th className="px-1.5 text-right">total</th>
                </tr>
              </thead>
              <tbody>
                {[...log].reverse().map((entry) => (
                  <tr key={entry.id} data-id={`bot-debug-row-${entry.id}`}>
                    <td>{entry.seat}</td>
                    <PhaseCell ms={entry.handoffMs} label={t("botDebugHandoff")} />
                    <PhaseCell ms={entry.decideMs} label={t("botDebugDecide")} />
                    <PhaseCell
                      ms={entry.submitMs}
                      serverMs={entry.submitServerMs}
                      serverLabel={t("botDebugServerSuffix")}
                      label={t("botDebugSubmit")}
                    />
                    <PhaseCell
                      ms={entry.refetchMs}
                      serverMs={entry.refetchServerMs}
                      serverLabel={t("botDebugServerSuffix")}
                      label={t("botDebugRefetch")}
                    />
                    <td className="px-1.5 text-right font-bold">{cell(entry.totalMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
