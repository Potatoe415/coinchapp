"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/client/i18n";
import type { PlayerView, Trick } from "@/lib/coinche";
import { formatContract } from "./labels";
import { PlayingCard } from "./PlayingCard";

export interface HostControls {
  isHost: boolean;
  hostName: string | null;
  onBecomeHost: () => Promise<void> | void;
}

export function GameHud({ view, host, onReset }: { view: PlayerView; host?: HostControls; onReset?: () => void }) {
  const { locale, t } = useI18n();
  const [panelOpen, setPanelOpen] = useState(false);
  return (
    <header className="absolute inset-x-0 top-4 z-30 px-3" data-id="game-header">
      <div className="flex items-start justify-between">
        <IconLink href="/" label={t("back")} dataId="game-back">
          ‹
        </IconLink>
        <div className="flex flex-col items-center">
          <div className="flex min-w-52 items-center justify-between rounded-lg bg-[var(--surface-overlay)] px-4 py-1 shadow-lg">
            <ScoreNumber color="var(--team-a)" value={view.scores.A} />
            <div className="text-center leading-none">
              <p className="text-[8px] font-black uppercase">{t("target")}</p>
              <p className="text-xl font-black" data-id="game-target">
                {view.targetPoints}
              </p>
            </div>
            <ScoreNumber color="var(--team-b)" value={view.scores.B} />
          </div>
          <p className="mt-2 rounded-full bg-[var(--surface-overlay)] px-4 py-1 text-base font-black" data-id="game-contract">
            {view.trump ? formatContract(view.contract, locale) : t("bidding")}
          </p>
        </div>
        <ParametersButton label={t("parameters")} onClick={() => setPanelOpen(true)} />
      </div>
      {panelOpen && (
        <ParametersPanel
          host={host}
          onReset={onReset}
          lastTrick={view.lastTrick}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </header>
  );
}

function ParametersPanel({
  host,
  onReset,
  lastTrick,
  onClose,
}: {
  host?: HostControls;
  onReset?: () => void;
  lastTrick: Trick | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-6"
      data-id="parameters-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
        data-id="parameters-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-center text-lg font-black text-[var(--card-face)]">{t("parameters")}</p>

        {lastTrick && lastTrick.cards.length === 4 && (
          <div className="mb-4" data-id="last-trick-section">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--card-face)]/60">
              {t("lastTrick")}
            </p>
            <div className="flex justify-center" data-id="last-trick-preview">
              {lastTrick.cards.map((played, i) => (
                <div key={i} className={i > 0 ? "-ml-3" : ""} style={{ zIndex: i }}>
                  <PlayingCard card={played.card} size="sm" dataId={`last-trick-card-${i}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="rounded-lg bg-[var(--card-face)]/8 px-3 py-2 text-sm text-[var(--card-face)]"
          data-id="parameters-rules"
        >
          <p data-id="parameters-rule-capot">
            {t("capot")}: <span className="font-bold">{scoringRules.capotMadePoints}</span>
          </p>
          <p data-id="parameters-rule-failed-capot">
            {t("failedCapot")}: <span className="font-bold">{scoringRules.capotFailedDefensePoints}</span>
          </p>
        </div>
        {host && <HostRow host={host} onClose={onClose} />}
        {onReset && (
          <button
            data-id="parameters-reset-button"
            onClick={() => { onReset(); onClose(); }}
            className="mt-2 w-full rounded-lg bg-[var(--accent-red)]/80 py-2 font-bold text-[var(--card-face)]"
          >
            {t("restartGame")}
          </button>
        )}
        <button
          data-id="parameters-close-button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-[var(--card-face)]/14 py-2 font-bold text-[var(--card-face)]"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}

function HostRow({ host, onClose }: { host: HostControls; onClose: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function takeOver() {
    setBusy(true);
    try {
      await host.onBecomeHost();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-id="host-row">
      <p className="text-sm text-[var(--card-face)]/80">
        {t("currentHost")}: <span className="font-bold text-[var(--card-face)]">{host.hostName ?? "—"}</span>
      </p>
      {host.isHost ? (
        <p className="rounded-lg bg-[var(--accent-green)]/20 py-2 text-center text-sm font-bold text-[var(--card-face)]" data-id="host-status-you">
          {t("youAreHost")}
        </p>
      ) : (
        <button
          data-id="become-host-button"
          disabled={busy}
          onClick={takeOver}
          className="rounded-lg bg-[var(--accent-yellow)] py-2 font-bold text-[var(--surface)] disabled:opacity-50"
        >
          {t("becomeHost")}
        </button>
      )}
    </div>
  );
}

function IconLink({
  href,
  label,
  dataId,
  children,
}: {
  href: string;
  label: string;
  dataId: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--card-face)] text-5xl font-black leading-none text-[var(--surface)] shadow-lg"
      data-id={dataId}
    >
      {children}
    </Link>
  );
}

function ParametersButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-id="game-parameters-button"
      onClick={onClick}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--card-face)] text-[var(--surface)] shadow-lg"
      aria-label={label}
    >
      <span className="flex items-end gap-1">
        <span className="h-5 w-2 rounded-full bg-[var(--accent-orange)]" />
        <span className="h-9 w-2 rounded-full bg-[var(--accent-yellow)]" />
        <span className="h-7 w-2 rounded-full bg-[var(--accent-cyan)]" />
      </span>
    </button>
  );
}

function ScoreNumber({ color, value }: { color: string; value: number }) {
  return (
    <span className="min-w-10 text-center text-3xl font-black leading-none" style={{ color }}>
      {value}
    </span>
  );
}
