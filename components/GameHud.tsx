"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/client/i18n";
import { cardPoints, nextSeat, type PlayerView, type Trick, type TrumpMode } from "@/lib/coinche";
import type { LobbyPlayer } from "@/lib/server/view";
import { formatContract } from "./labels";
import { PlayingCard } from "./PlayingCard";

function trickPoints(trick: Trick | null, trump: TrumpMode | null): number {
  if (!trick || trick.cards.length !== 4) return 0;
  return trick.cards.reduce((sum, played) => sum + cardPoints(played.card, trump), 0);
}

export interface HostControls {
  isHost: boolean;
  hostName: string | null;
  onBecomeHost: () => Promise<void> | void;
  /** Manual escape hatch if the game looks stuck: refetch + rebuild the realtime channel. */
  onForceSync: () => void;
}

export interface EmojiControls {
  enabled: boolean;
  onToggle: () => void;
}

export function GameHud({
  view,
  host,
  infoCode,
  onReset,
  onReshuffle,
  emojiControls,
  players,
}: {
  view: PlayerView;
  host?: HostControls;
  infoCode?: string;
  onReset?: () => void;
  onReshuffle?: () => void;
  emojiControls?: EmojiControls;
  players?: LobbyPlayer[];
}) {
  const { locale, t } = useI18n();
  const [panelOpen, setPanelOpen] = useState(false);
  const noCardPlayed = view.tricks.length === 0 && view.currentTrick.cards.length === 0;
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
          <p
            className="mt-2 rounded-full px-4 py-1 text-base font-black text-[var(--card-face)]"
            style={{
              background: view.contract
                ? view.contract.team === "A"
                  ? "var(--team-a)"
                  : "var(--team-b)"
                : "var(--surface-overlay)",
            }}
            data-id="game-contract"
          >
            {view.trump ? formatContract(view.contract, locale) : t("biddingInProgress")}
          </p>
          {view.phase === "bidding" && (() => {
            const firstSeat = nextSeat(view.dealer);
            const isMe = firstSeat === view.mySeat;
            const name = players?.find((p) => p.seat === firstSeat)?.displayName;
            const label = isMe ? "Tu commences" : name ? `${name} commence` : null;
            return label ? (
              <p className="mt-1 text-xs italic text-[var(--card-face)]/70" data-id="game-bidding-starter">
                {label}
              </p>
            ) : null;
          })()}
        </div>
        <GameInfoButton label={t("gameInfo")} onClick={() => setPanelOpen(true)} />
      </div>
      {panelOpen && (
        <GameInfoPanel
          host={host}
          infoCode={infoCode}
          onReset={onReset}
          onReshuffle={noCardPlayed ? onReshuffle : undefined}
          emojiControls={emojiControls}
          lastTrick={view.lastTrick}
          lastTrickPts={view.lastTrick ? trickPoints(view.lastTrick, view.trump) : null}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </header>
  );
}

function GameInfoPanel({
  host,
  infoCode,
  onReset,
  onReshuffle,
  emojiControls,
  lastTrick,
  lastTrickPts,
  onClose,
}: {
  host?: HostControls;
  infoCode?: string;
  onReset?: () => void;
  onReshuffle?: () => void;
  emojiControls?: EmojiControls;
  lastTrick: Trick | null;
  lastTrickPts: number | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-6"
      data-id="game-info-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
        data-id="game-info-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-center text-lg font-black text-[var(--card-face)]">{t("gameInfo")}</p>

        {infoCode && (
          <div className="mb-3 flex items-center justify-between" data-id="game-info-code-row">
            <span className="text-sm text-[var(--card-face)]/80">No. Info partie</span>
            <span className="rounded-md bg-[var(--card-face)]/10 px-2 py-1 text-sm font-black tracking-widest text-[var(--card-face)]" data-id="game-info-code-value">
              {infoCode}
            </span>
          </div>
        )}

        {lastTrick && lastTrick.cards.length === 4 && (
          <div className="mb-4" data-id="last-trick-section">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--card-face)]/60">
              {t("lastTrick")}{lastTrickPts != null ? ` (${lastTrickPts} pts)` : ""}
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

        {emojiControls && (
          <div className="mb-3 flex items-center justify-between" data-id="emoji-toggle-row">
            <span className="text-sm text-[var(--card-face)]/80">Réactions emoji</span>
            <button
              data-id="emoji-toggle-button"
              onClick={emojiControls.onToggle}
              aria-pressed={emojiControls.enabled}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
                emojiControls.enabled ? "bg-[var(--accent-green)]" : "bg-[var(--card-face)]/20"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                  emojiControls.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        {host && <HostRow host={host} onClose={onClose} />}
        {onReshuffle && (
          <button
            data-id="game-info-reshuffle-button"
            onClick={() => { onReshuffle(); onClose(); }}
            className="mt-2 w-full rounded-lg bg-[var(--accent-yellow)]/80 py-2 font-bold text-[var(--surface)]"
          >
            Nouvelle donne
          </button>
        )}
        {onReset && (
          <button
            data-id="game-info-reset-button"
            onClick={() => { onReset(); onClose(); }}
            className="mt-2 w-full rounded-lg bg-[var(--accent-red)]/80 py-2 font-bold text-[var(--card-face)]"
          >
            {t("restartGame")}
          </button>
        )}
        <button
          data-id="game-info-close-button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-[var(--card-face)]/14 py-2 font-bold text-[var(--card-face)]"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}

export function HostRow({ host, onClose }: { host: HostControls; onClose: () => void }) {
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
      <button
        data-id="force-sync-button"
        onClick={host.onForceSync}
        className="rounded-lg bg-[var(--card-face)]/14 py-2 font-bold text-[var(--card-face)]"
      >
        {t("forceSync")}
      </button>
      <p className="text-xs text-[var(--card-face)]/60" data-id="force-sync-hint">
        {t("forceSyncHint")}
      </p>
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

export function GameInfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-id="game-info-button"
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
