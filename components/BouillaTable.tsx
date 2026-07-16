"use client";

import { useEffect, useState } from "react";
import type { Card, PlayerView } from "@/lib/bouilla";
import type { GameView } from "@/lib/server/view";
import { BouillaRoundOverlay } from "./BouillaRoundOverlay";
import { BouillaScoreboard } from "./BouillaScoreboard";
import { ROUND_LABEL_FR, ROUND_PENALTY_LABEL_FR } from "./bouillaLabels";
import { EmojiButton, type EmojiReaction } from "./EmojiButton";
import { isConnected, playerName, relativeSeat } from "./gameTableHelpers";
import { GameInfoButton, HostRow, type EmojiControls, type HostControls } from "./GameHud";
import { PlayerBadge } from "./PlayerBadge";
import { CardBack, PlayingCard } from "./PlayingCard";

/** This table only ever renders a Bouilla game: narrow the shared, multi-game
 *  `GameView` down to its Bouilla-specific view/botViews shape. */
export type BouillaGameView = Omit<GameView, "view" | "botViews"> & {
  view: PlayerView | null;
  botViews?: Record<number, PlayerView>;
};

export interface BouillaActions {
  onPlay: (card: Card) => Promise<void> | void;
  onNextRound: () => Promise<void> | void;
  /** Online only: take over running the bots. */
  onBecomeHost?: () => Promise<void> | void;
  /** Online only: force a manual re-sync. */
  onForceSync?: () => void;
  /** Local only: restart the game from scratch. */
  onReset?: () => void;
  /** Send an emoji reaction visible to all players. */
  onSendEmoji?: (emoji: string) => void;
}

const HAND_STEP = 36;
const CARD_W_LG = 64;

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function BouillaTable({
  gv,
  actions,
  reactions,
}: {
  gv: BouillaGameView;
  actions: BouillaActions;
  reactions?: Map<number, EmojiReaction>;
}) {
  const view = gv.view!;
  const mySeat = gv.mySeat!;
  const [busy, setBusy] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [emojiOn, setEmojiOn] = useState(true);

  useEffect(() => {
    // Post-hydration browser read: deferred to after mount to avoid an SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem("coinchapp-emoji") === "false") setEmojiOn(false);
  }, []);

  function toggleEmoji() {
    setEmojiOn((v) => {
      localStorage.setItem("coinchapp-emoji", String(!v));
      return !v;
    });
  }

  const seats = {
    top: relativeSeat(mySeat, 2),
    left: relativeSeat(mySeat, 3),
    right: relativeSeat(mySeat, 1),
    bottom: mySeat,
  };
  const legalSet = new Set(view.legalCards.map(cardKey));
  const myTurnToPlay = view.phase === "playing" && view.turn === mySeat;
  const trickBySeat = new Map<number, Card>(view.currentTrick.cards.map((p) => [p.seat, p.card]));

  async function onPlay(card: Card) {
    if (!myTurnToPlay || !legalSet.has(cardKey(card)) || busy) return;
    setBusy(true);
    try {
      await actions.onPlay(card);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="relative mx-auto flex h-svh min-h-[720px] w-full max-w-[460px] flex-1 flex-col overflow-hidden bg-felt text-[var(--card-face)]"
      data-id="bouilla-table"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#3aa59b_0%,#2f877f_48%,#276f69_100%)]" />
      <BouillaHud
        gv={gv}
        view={view}
        onOpenScoreboard={() => setScoreboardOpen(true)}
        onReset={actions.onReset}
        host={
          actions.onBecomeHost && actions.onForceSync
            ? { isHost: gv.isHost, hostName: gv.hostSeat !== null ? playerName(gv, gv.hostSeat) : null, onBecomeHost: actions.onBecomeHost, onForceSync: actions.onForceSync }
            : undefined
        }
        emojiControls={actions.onSendEmoji ? { enabled: emojiOn, onToggle: toggleEmoji } : undefined}
      />
      <div className="flex-1" aria-hidden="true" />
      <div className="relative h-[720px] w-full shrink-0" data-id="bouilla-table-scene">
        <div
          className="absolute inset-x-[11%] bottom-[19%] top-[29%] rounded-[3rem] bg-[rgba(255,250,242,0.08)] shadow-[inset_0_0_55px_rgba(22,200,240,0.22)] ring-[10px] ring-[rgba(242,196,79,0.18)]"
          data-id="bouilla-central-felt"
        />
        <OpponentTop gv={gv} view={view} seat={seats.top} reaction={reactions?.get(seats.top)} />
        <OpponentSide gv={gv} view={view} seat={seats.left} side="left" reaction={reactions?.get(seats.left)} />
        <OpponentSide gv={gv} view={view} seat={seats.right} side="right" reaction={reactions?.get(seats.right)} />
        <PlayedSlot className="top-[36%] left-1/2 -translate-x-1/2" card={trickBySeat.get(seats.top)} dataId="bouilla-played-top" />
        <PlayedSlot className="top-[45%] left-[27%]" card={trickBySeat.get(seats.left)} dataId="bouilla-played-left" />
        <PlayedSlot className="top-[45%] right-[27%]" card={trickBySeat.get(seats.right)} dataId="bouilla-played-right" />
        <PlayedSlot className="bottom-[25%] left-1/2 -translate-x-1/2" card={trickBySeat.get(seats.bottom)} dataId="bouilla-played-bottom" />
        <BouillaRoundOverlay gv={gv} view={view} onNextRound={actions.onNextRound} nextRoundGate={gv.nextDealGate} />
        {emojiOn && actions.onSendEmoji && <EmojiButton myReaction={reactions?.get(mySeat)} onSelect={actions.onSendEmoji} />}
        <HandFan hand={view.myHand} legalSet={legalSet} myTurnToPlay={myTurnToPlay} onCardClick={onPlay} />
      </div>
      <div className="flex-1" aria-hidden="true" />
      {scoreboardOpen && <BouillaScoreboard gv={gv} view={view} onClose={() => setScoreboardOpen(false)} />}
    </main>
  );
}

function BouillaHud({
  gv,
  view,
  onOpenScoreboard,
  emojiControls,
  onReset,
  host,
}: {
  gv: BouillaGameView;
  view: PlayerView;
  onOpenScoreboard: () => void;
  emojiControls?: EmojiControls;
  onReset?: () => void;
  host?: HostControls;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <header className="absolute inset-x-0 top-4 z-30 px-3" data-id="bouilla-header">
      <div className="flex items-start justify-between">
        <IconLink href="/" dataId="bouilla-back">‹</IconLink>
        <div className="flex flex-col items-center">
          <button
            type="button"
            data-id="bouilla-round-name"
            onClick={onOpenScoreboard}
            className="rounded-full bg-[var(--surface-overlay)] px-4 py-1 text-base font-black text-[var(--card-face)]"
          >
            {ROUND_LABEL_FR[view.round]} ({view.roundIndex + 1}/6)
          </button>
          <p className="mt-1 text-xs text-[var(--card-face)]/70" data-id="bouilla-round-penalty">
            {ROUND_PENALTY_LABEL_FR[view.round]}
          </p>
        </div>
        <GameInfoButton label="Réglages" onClick={() => setSettingsOpen(true)} />
      </div>
      {settingsOpen && (
        <BouillaSettingsPanel
          gv={gv}
          host={host}
          onReset={onReset}
          emojiControls={emojiControls}
          onOpenScoreboard={() => {
            setSettingsOpen(false);
            onOpenScoreboard();
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </header>
  );
}

function BouillaSettingsPanel({
  gv,
  host,
  onReset,
  emojiControls,
  onOpenScoreboard,
  onClose,
}: {
  gv: BouillaGameView;
  host?: HostControls;
  onReset?: () => void;
  emojiControls?: EmojiControls;
  onOpenScoreboard: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-6"
      data-id="bouilla-settings-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
        data-id="bouilla-settings-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-center text-lg font-black text-[var(--card-face)]">Réglages</p>

        {gv.roomCode && gv.roomCode !== "P2P" && (
          <div className="mb-3 flex items-center justify-between" data-id="bouilla-info-code-row">
            <span className="text-sm text-[var(--card-face)]/80">No. Info partie</span>
            <span className="rounded-md bg-[var(--card-face)]/10 px-2 py-1 text-sm font-black tracking-widest text-[var(--card-face)]" data-id="bouilla-info-code-value">
              {gv.roomCode}
            </span>
          </div>
        )}

        <button
          data-id="bouilla-settings-scoreboard-button"
          onClick={onOpenScoreboard}
          className="mb-3 w-full rounded-lg bg-[var(--card-face)]/14 py-2 font-bold text-[var(--card-face)]"
        >
          Tableau des scores
        </button>

        {emojiControls && (
          <div className="mb-3 flex items-center justify-between" data-id="bouilla-emoji-toggle-row">
            <span className="text-sm text-[var(--card-face)]/80">Réactions emoji</span>
            <button
              data-id="bouilla-emoji-toggle-button"
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
        {onReset && (
          <button
            data-id="bouilla-settings-reset-button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="mt-2 w-full rounded-lg bg-[var(--accent-red)]/80 py-2 font-bold text-[var(--card-face)]"
          >
            Recommencer
          </button>
        )}
        <button
          data-id="bouilla-settings-close-button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-[var(--card-face)]/14 py-2 font-bold text-[var(--card-face)]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function IconLink({ href, dataId, children }: { href: string; dataId: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      data-id={dataId}
      className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--card-face)] text-5xl font-black leading-none text-[var(--surface)] shadow-lg"
    >
      {children}
    </a>
  );
}

function OpponentTop({
  gv,
  view,
  seat,
  reaction,
}: {
  gv: BouillaGameView;
  view: PlayerView;
  seat: number;
  reaction?: EmojiReaction;
}) {
  return (
    <div className="absolute left-1/2 top-[13%] flex -translate-x-1/2 flex-col items-center" data-id="bouilla-table-top">
      <CardBackFanH count={view.handCounts[seat]} />
      <div className="mt-2" data-id="bouilla-table-top-badge">
        <PlayerBadge
          name={playerName(gv, seat)}
          team={seat % 2 === 0 ? "A" : "B"}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
          isThinking={view.phase === "playing" && view.turn === seat}
          connected={isConnected(gv, seat)}
          reaction={reaction}
          dataId={`bouilla-player-seat-${seat}`}
        />
      </div>
    </div>
  );
}

function OpponentSide({
  gv,
  view,
  seat,
  side,
  reaction,
}: {
  gv: BouillaGameView;
  view: PlayerView;
  seat: number;
  side: "left" | "right";
  reaction?: EmojiReaction;
}) {
  const sideClass = side === "left" ? "left-0 flex-row" : "right-0 flex-row-reverse";
  const handShiftClass = side === "left" ? "-translate-x-3/4" : "translate-x-3/4";
  const badgeNudgeClass = side === "left" ? "-ml-[50px]" : "-mr-[50px]";
  const badgeRotateClass = side === "right" ? "rotate-180" : "";
  return (
    <div className={`absolute top-[41%] flex items-center gap-0 ${sideClass}`} data-id={`bouilla-table-${side}`}>
      <div className={handShiftClass}>
        <CardBackStackV count={view.handCounts[seat]} />
      </div>
      <div className={`${badgeNudgeClass} ${badgeRotateClass}`}>
        <PlayerBadge
          name={playerName(gv, seat)}
          team={seat % 2 === 0 ? "A" : "B"}
          isTurn={view.turn === seat}
          isDealer={view.dealer === seat}
          isThinking={view.phase === "playing" && view.turn === seat}
          connected={isConnected(gv, seat)}
          reaction={reaction}
          orientation="vertical"
          dataId={`bouilla-player-seat-${seat}`}
        />
      </div>
    </div>
  );
}

function PlayedSlot({ className, card, dataId }: { className: string; card?: Card; dataId: string }) {
  return (
    <div className={`absolute ${className}`} data-id={`${dataId}-slot`}>
      {card ? (
        <div className="played-card-enter will-change-transform" data-id={`${dataId}-anim`}>
          <PlayingCard card={card} size="lg" dataId={dataId} />
        </div>
      ) : (
        <div className="h-24 w-16 rounded-xl bg-[rgba(32,40,58,0.12)]" data-id={dataId} />
      )}
    </div>
  );
}

function HandFan({
  hand,
  legalSet,
  myTurnToPlay,
  onCardClick,
}: {
  hand: Card[];
  legalSet: Set<string>;
  myTurnToPlay: boolean;
  onCardClick: (card: Card) => void;
}) {
  const sorted = [...hand].sort((a, b) => (a.suit === b.suit ? 0 : a.suit < b.suit ? -1 : 1));
  const n = sorted.length;
  const fanW = n > 1 ? CARD_W_LG + (n - 1) * HAND_STEP : CARD_W_LG;

  return (
    <section className="absolute inset-x-0 bottom-0 z-20 pb-3" data-id="bouilla-action-area">
      <div className="relative flex h-[8.5rem] w-full items-end justify-center" data-id="bouilla-my-hand">
        <div className="relative h-full" style={{ width: fanW }}>
          {sorted.map((card, i) => {
            const key = cardKey(card);
            const isPlayable = myTurnToPlay && legalSet.has(key);
            const isDimmed = myTurnToPlay && !legalSet.has(key);
            return (
              <div
                key={key}
                className="absolute bottom-0 transition-transform duration-150"
                style={{ left: i * HAND_STEP, zIndex: isPlayable ? 50 + i : i }}
              >
                <PlayingCard
                  card={card}
                  size="lg"
                  dataId={`bouilla-hand-card-${key}`}
                  playable={isPlayable}
                  dimmed={isDimmed}
                  onClick={isPlayable ? () => onCardClick(card) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const FAN_STEP_H = 22;
const CARD_W_MD = 56;

function CardBackFanH({ count }: { count: number }) {
  const n = Math.min(count, 13);
  if (n === 0) return <div className="h-24 w-14" />;
  const totalW = CARD_W_MD + (n - 1) * FAN_STEP_H * 0.6;
  return (
    <div className="relative h-24" style={{ width: totalW }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="absolute bottom-0" style={{ left: i * FAN_STEP_H * 0.6, zIndex: i }}>
          <CardBack size="md" />
        </div>
      ))}
    </div>
  );
}

function CardBackStackV({ count }: { count: number }) {
  const n = Math.min(count, 13);
  if (n === 0) return <div className="h-14 w-20" />;
  return (
    <div className="relative w-20" style={{ height: 56 + (n - 1) * 4 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="absolute" style={{ top: i * 4, zIndex: i }}>
          <div className="relative h-14 w-20">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90">
              <CardBack size="md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
