"use client";

import { useEffect, useState } from "react";
import { rankValue, type Card, type Combo, type PlayerView, type Seat } from "@/lib/president";
import { useDelayedVisible } from "@/lib/client/useDelayedVisible";
import { formatText, useI18n } from "@/lib/client/i18n";
import type { ReactionPick, TableReaction } from "@/lib/client/reactions";
import type { GameView } from "@/lib/server/view";
import { EmojiButton } from "./EmojiButton";
import { isConnected, playerName, relativeSeat } from "./gameTableHelpers";
import { GameInfoButton, HostRow, type EmojiControls, type HostControls } from "./GameHud";
import { PlayerBadge } from "./PlayerBadge";
import { PlayingCard } from "./PlayingCard";
import { PresidentExchangePanel } from "./PresidentExchangePanel";
import { TITLE_SHORT_LABEL } from "./presidentLabels";
import { PresidentRoundOverlay } from "./PresidentRoundOverlay";
import { PresidentScoreboard } from "./PresidentScoreboard";
import { SelfNameChip } from "./SelfNameChip";
import { CardBackFanH, CardBackStackV, playedCardEnterStyle, seatDirection, type TableSeats } from "./TrickStage";

/** This table only ever renders a Président game: narrow the shared, multi-game
 *  `GameView` down to its Président-specific view/botViews shape. */
export type PresidentGameView = Omit<GameView, "view" | "botViews"> & {
  view: PlayerView | null;
  botViews?: Record<number, PlayerView>;
};

export interface PresidentActions {
  onPlay: (combo: Combo) => Promise<void> | void;
  onPass: () => Promise<void> | void;
  onExchangeReturn: (cards: Card[]) => Promise<void> | void;
  onNextRound: () => Promise<void> | void;
  /** Online only: take over running the bots. */
  onBecomeHost?: () => Promise<void> | void;
  /** Online only: force a manual re-sync. */
  onForceSync?: () => void;
  /** Local only: restart the game from scratch. */
  onReset?: () => void;
  /** Send an emoji or GIF reaction visible to all players. */
  onSendReaction?: (pick: ReactionPick) => void;
  /** Online only: from the finished screen, start a fresh match in the same room. */
  onRematch?: () => Promise<void> | void;
}

const MAX_HAND_COUNT = 13;
/** How long to wait before auto-passing when passing is the only legal move
 *  (see `mustPass` in `PresidentTable`), if the setting is enabled. */
const AUTO_PASS_DELAY_MS = 2000;

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function PresidentTable({
  gv,
  actions,
  reactions,
  selfAvatar,
}: {
  gv: PresidentGameView;
  actions: PresidentActions;
  reactions?: Map<number, TableReaction>;
  /** Set only from online GameRoom. Undefined hides the local-player chip. */
  selfAvatar?: string;
}) {
  const { locale } = useI18n();
  const view = gv.view!;
  const mySeat = gv.mySeat!;
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [emojiOn, setEmojiOn] = useState(true);
  const [autoPassOn, setAutoPassOn] = useState(true);
  const [selected, setSelected] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [handSort, setHandSort] = useState<HandSortMode>("suit");

  useEffect(() => {
    // Post-hydration browser read: deferred to after mount to avoid an SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem("coinchapp-emoji") === "false") setEmojiOn(false);
    if (localStorage.getItem("coinchapp-president-autopass") === "false") setAutoPassOn(false);
  }, []);

  function toggleEmoji() {
    setEmojiOn((v) => {
      localStorage.setItem("coinchapp-emoji", String(!v));
      return !v;
    });
  }

  function toggleAutoPass() {
    setAutoPassOn((v) => {
      localStorage.setItem("coinchapp-president-autopass", String(!v));
      return !v;
    });
  }

  const seats: TableSeats = {
    top: relativeSeat(mySeat, 2),
    left: relativeSeat(mySeat, 3),
    right: relativeSeat(mySeat, 1),
    bottom: mySeat,
  };
  const myTurnToPlay = view.phase === "playing" && view.turn === mySeat;
  const selectedRank = selected[0]?.rank;
  const comboLegal =
    selected.length > 0 && view.legalCombos.some((c) => c.rank === selectedRank && c.cards.length === selected.length);
  const legalRanks = new Set(view.legalCombos.map((c) => c.rank));
  // True when every legal move this turn is a single card (leading with no
  // pairs/triples to offer, or following a pile already down to one card):
  // there is no card-count choice left to make, so tapping a card can play it
  // outright instead of waiting for the "Jouer" button.
  const singleCardTurn = view.legalCombos.length > 0 && view.legalCombos.every((c) => c.cards.length === 1);
  const roundOverlayVisible = useDelayedVisible(!!view.lastRoundResult || view.phase === "finished", 1200);

  async function tapCard(card: Card) {
    if (!myTurnToPlay || busy) return;
    if (singleCardTurn) {
      setBusy(true);
      try {
        await actions.onPlay({ rank: card.rank, cards: [card] });
        setSelected([]);
      } finally {
        setBusy(false);
      }
      return;
    }
    const key = cardKey(card);
    setSelected((prev) => {
      if (prev.some((c) => cardKey(c) === key)) return prev.filter((c) => cardKey(c) !== key);
      if (prev.length > 0 && prev[0].rank !== card.rank) return [card];
      return [...prev, card];
    });
  }

  async function handlePlay() {
    if (!comboLegal || busy || !selectedRank) return;
    setBusy(true);
    try {
      await actions.onPlay({ rank: selectedRank, cards: selected });
      setSelected([]);
    } finally {
      setBusy(false);
    }
  }

  async function handlePass() {
    if (!view.canPass || busy) return;
    setBusy(true);
    try {
      await actions.onPass();
      setSelected([]);
    } finally {
      setBusy(false);
    }
  }

  // When passing is the only legal action (no combo can beat the pile), the
  // "Passer" tap is a foregone conclusion: auto-pass after a short delay
  // instead of making the player tap it every time. Opt-out via settings.
  const mustPass = myTurnToPlay && view.canPass && view.legalCombos.length === 0;
  useEffect(() => {
    if (!autoPassOn || !mustPass || busy) return;
    const id = window.setTimeout(() => {
      void handlePass();
    }, AUTO_PASS_DELAY_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlePass closes over stable refs (view/busy checked inside)
  }, [autoPassOn, mustPass, busy]);

  return (
    <main
      className="relative mx-auto flex h-svh min-h-[720px] w-full max-w-[460px] flex-1 flex-col overflow-hidden bg-felt text-[var(--card-face)]"
      data-id="president-table"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#3aa59b_0%,#2f877f_48%,#276f69_100%)]" />
      <PresidentHud
        gv={gv}
        view={view}
        onOpenScoreboard={() => setScoreboardOpen(true)}
        onReset={actions.onReset}
        host={
          actions.onBecomeHost && actions.onForceSync
            ? { isHost: gv.isHost, hostName: gv.hostSeat !== null ? playerName(gv, gv.hostSeat, locale) : null, onBecomeHost: actions.onBecomeHost, onForceSync: actions.onForceSync }
            : undefined
        }
        emojiControls={actions.onSendReaction ? { enabled: emojiOn, onToggle: toggleEmoji } : undefined}
        autoPassControls={{ enabled: autoPassOn, onToggle: toggleAutoPass }}
      />
      <div className="flex-1" aria-hidden="true" />
      <div className="relative h-[720px] w-full shrink-0" data-id="president-table-scene">
        <div
          className="absolute inset-x-[11%] bottom-[19%] top-[29%] rounded-[3rem] bg-[rgba(255,250,242,0.08)] shadow-[inset_0_0_55px_rgba(22,200,240,0.22)] ring-[10px] ring-[rgba(242,196,79,0.18)]"
          data-id="president-central-felt"
        />
        {!roundOverlayVisible && (
          <>
            <OpponentBadge gv={gv} view={view} seat={seats.top} position="top" reaction={reactions?.get(seats.top)} />
            <OpponentBadge gv={gv} view={view} seat={seats.left} position="left" reaction={reactions?.get(seats.left)} />
            <OpponentBadge gv={gv} view={view} seat={seats.right} position="right" reaction={reactions?.get(seats.right)} />
          </>
        )}
        <PileArea view={view} seats={seats} />
        <SkipFlash gv={gv} view={view} />
        {view.phase === "exchange" && !roundOverlayVisible && (
          <PresidentExchangePanel gv={gv} view={view} onSubmit={actions.onExchangeReturn} />
        )}
        <PresidentRoundOverlay
          gv={gv}
          view={view}
          visible={roundOverlayVisible}
          onNextRound={actions.onNextRound}
          nextRoundGate={gv.nextDealGate}
          onRematch={actions.onRematch}
        />
        {selfAvatar !== undefined && !roundOverlayVisible && (
          <div className="absolute inset-x-0 bottom-[9.4rem] z-20" data-id="president-self-name-wrap">
            <SelfNameChip name={playerName(gv, mySeat, locale)} avatarSrc={selfAvatar} />
          </div>
        )}
        {emojiOn && actions.onSendReaction && <EmojiButton myReaction={reactions?.get(mySeat)} onSelect={actions.onSendReaction} />}
        {view.phase === "playing" && (
          <HandArea
            hand={view.myHand}
            selected={selected}
            myTurnToPlay={myTurnToPlay}
            legalRanks={legalRanks}
            revolution={view.revolution}
            sortMode={handSort}
            onToggleSort={() => setHandSort((mode) => (mode === "suit" ? "rank" : "suit"))}
            canPlay={comboLegal}
            canPass={view.canPass}
            busy={busy}
            onTap={tapCard}
            onPlay={handlePlay}
            onPass={handlePass}
          />
        )}
      </div>
      <div className="flex-1" aria-hidden="true" />
      {scoreboardOpen && <PresidentScoreboard gv={gv} view={view} onClose={() => setScoreboardOpen(false)} />}
    </main>
  );
}

function PresidentHud({
  gv,
  view,
  onOpenScoreboard,
  emojiControls,
  autoPassControls,
  onReset,
  host,
}: {
  gv: PresidentGameView;
  view: PlayerView;
  onOpenScoreboard: () => void;
  emojiControls?: EmojiControls;
  autoPassControls: EmojiControls;
  onReset?: () => void;
  host?: HostControls;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useI18n();
  return (
    <header className="absolute inset-x-0 top-4 z-30 px-3" data-id="president-header">
      <div className="flex items-start justify-between">
        <IconLink href="/" label={t("backHome")} dataId="president-back">‹</IconLink>
        <div className="flex flex-col items-center">
          <button
            type="button"
            data-id="president-round-name"
            onClick={onOpenScoreboard}
            className="rounded-full bg-[var(--surface-overlay)] px-4 py-1 text-base font-black text-[var(--card-face)]"
          >
            {t("round")} {view.roundIndex + 1}/{view.roundsToPlay}
          </button>
          {view.revolution && (
            <p className="mt-1 text-xs font-bold text-[var(--accent-red)]" data-id="president-revolution-banner">
              {t("revolutionActive")}
            </p>
          )}
        </div>
        <GameInfoButton label={t("settings")} onClick={() => setSettingsOpen(true)} />
      </div>
      {settingsOpen && (
        <PresidentSettingsPanel
          gv={gv}
          host={host}
          onReset={onReset}
          emojiControls={emojiControls}
          autoPassControls={autoPassControls}
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

function PresidentSettingsPanel({
  gv,
  host,
  onReset,
  emojiControls,
  autoPassControls,
  onOpenScoreboard,
  onClose,
}: {
  gv: PresidentGameView;
  host?: HostControls;
  onReset?: () => void;
  emojiControls?: EmojiControls;
  autoPassControls: EmojiControls;
  onOpenScoreboard: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-6" data-id="president-settings-overlay" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl bg-[var(--surface)] p-5 shadow-2xl" data-id="president-settings-panel" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 text-center text-lg font-black text-[var(--card-face)]">{t("settings")}</p>
        {gv.roomCode && gv.roomCode !== "P2P" && (
          <div className="mb-3 flex items-center justify-between" data-id="president-info-code-row">
            <span className="text-sm text-[var(--card-face)]/80">{t("gameInfoNumber")}</span>
            <span className="rounded-md bg-[var(--card-face)]/10 px-2 py-1 text-sm font-black tracking-widest text-[var(--card-face)]" data-id="president-info-code-value">
              {gv.roomCode}
            </span>
          </div>
        )}
        <button
          data-id="president-settings-scoreboard-button"
          onClick={onOpenScoreboard}
          className="mb-3 w-full rounded-lg bg-[var(--card-face)]/14 py-2 font-bold text-[var(--card-face)]"
        >
          {t("scoreboard")}
        </button>
        {emojiControls && (
          <div className="mb-3 flex items-center justify-between" data-id="president-emoji-toggle-row">
            <span className="text-sm text-[var(--card-face)]/80">{t("emojiReactions")}</span>
            <button
              data-id="president-emoji-toggle-button"
              onClick={emojiControls.onToggle}
              aria-pressed={emojiControls.enabled}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${emojiControls.enabled ? "bg-[var(--accent-green)]" : "bg-[var(--card-face)]/20"}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${emojiControls.enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        )}
        <div className="mb-3 flex items-center justify-between" data-id="president-autopass-toggle-row">
          <span className="text-sm text-[var(--card-face)]/80">{t("autoPassLabel")}</span>
          <button
            data-id="president-autopass-toggle-button"
            onClick={autoPassControls.onToggle}
            aria-pressed={autoPassControls.enabled}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${autoPassControls.enabled ? "bg-[var(--accent-green)]" : "bg-[var(--card-face)]/20"}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${autoPassControls.enabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        {host && <HostRow host={host} onClose={onClose} />}
        {onReset && (
          <button
            data-id="president-settings-reset-button"
            onClick={() => { onReset(); onClose(); }}
            className="mt-2 w-full rounded-lg bg-[var(--accent-red)]/80 py-2 font-bold text-[var(--card-face)]"
          >
            {t("restartGame")}
          </button>
        )}
        <button data-id="president-settings-close-button" onClick={onClose} className="mt-4 w-full rounded-lg bg-[var(--card-face)]/14 py-2 font-bold text-[var(--card-face)]">
          {t("close")}
        </button>
      </div>
    </div>
  );
}

function IconLink({ href, label, dataId, children }: { href: string; label: string; dataId: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} data-id={dataId} className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--card-face)] text-5xl font-black leading-none text-[var(--surface)] shadow-lg">
      {children}
    </a>
  );
}

const POSITION_CLASS: Record<"top" | "left" | "right", string> = {
  top: "left-1/2 top-[13%] -translate-x-1/2 flex-col",
  left: "left-0 top-[41%] flex-row",
  right: "right-0 top-[41%] flex-row-reverse",
};

function OpponentBadge({
  gv,
  view,
  seat,
  position,
  reaction,
}: {
  gv: PresidentGameView;
  view: PlayerView;
  seat: number;
  position: "top" | "left" | "right";
  reaction?: TableReaction;
}) {
  const { locale } = useI18n();
  const title = view.titles ? TITLE_SHORT_LABEL[locale][view.titles[seat]] : null;
  return (
    <div className={`absolute flex items-center gap-0 ${POSITION_CLASS[position]}`} data-id={`president-table-${position}`}>
      {position === "top" ? (
        <CardBackFanH count={view.handCounts[seat]} maxCount={MAX_HAND_COUNT} />
      ) : (
        <div className={position === "left" ? "-translate-x-3/4" : "translate-x-3/4"}>
          <CardBackStackV count={view.handCounts[seat]} maxCount={MAX_HAND_COUNT} />
        </div>
      )}
      <div className={position === "top" ? "mt-2" : position === "left" ? "-ml-[50px]" : "-mr-[50px] rotate-180"} data-id={`president-table-${position}-badge`}>
        <PlayerBadge
          name={playerName(gv, seat, locale)}
          team={seat % 2 === 0 ? "A" : "B"}
          isTurn={view.turn === seat}
          isDealer={false}
          isThinking={view.phase === "playing" && view.turn === seat}
          connected={isConnected(gv, seat)}
          reaction={reaction}
          orientation={position === "top" ? "horizontal" : "vertical"}
          dataId={`president-player-seat-${seat}`}
        />
        {title && <p className="text-center text-[10px] font-bold text-[var(--card-face)]/70" data-id={`president-title-seat-${seat}`}>{title}</p>}
      </div>
    </div>
  );
}

function comboKey(combo: Combo | null): string {
  return combo ? combo.cards.map(cardKey).join(",") : "";
}

type BurnEvent = PlayerView["lastBurn"];

function burnKey(burn: BurnEvent): string {
  return burn ? `${burn.seat}:${comboKey(burn.combo)}` : "";
}

/** Matches the shared `.trick-collect-card` CSS animation duration
 *  (`app/globals.css`) reused below for the burn sweep. */
const BURN_ANIMATION_MS = 1500;

/** Keeps the last 2 combos this pile cycle so `PileArea` can show them fading
 *  behind the current one - purely a display trail, cleared once the pile
 *  itself clears. When the pile clears *because a "2" burned it*
 *  (`view.lastBurn`, see `lib/president/play.ts`), the whole trail plus the
 *  burning combo stays on screen for `BURN_ANIMATION_MS` so `PileArea` can
 *  play the "collect" sweep instead of the pile just vanishing. Adjusts state
 *  during render for the prop-driven parts (React's documented "reset state
 *  on prop change" pattern), an effect only for the animation's own timeout. */
function usePileDisplay(pile: PlayerView["pile"], lastBurn: BurnEvent): { stack: Combo[]; burning: boolean } {
  const [history, setHistory] = useState<Combo[]>([]);
  const [burning, setBurning] = useState(false);
  const [track, setTrack] = useState<{ combo: Combo | null; comboKey: string; burnKey: string }>({
    combo: null,
    comboKey: "",
    burnKey: "",
  });

  const combo = pile.combo;
  const nextComboKey = comboKey(combo);
  const nextBurnKey = burnKey(lastBurn);

  if (nextComboKey !== track.comboKey || nextBurnKey !== track.burnKey) {
    if (combo !== null) {
      const previous = track.combo;
      setHistory((h) => (previous ? [...h, previous].slice(-2) : []));
      setBurning(false);
    } else if (nextBurnKey && nextBurnKey !== track.burnKey) {
      const previous = track.combo;
      const burningCombo = lastBurn!.combo;
      setHistory((h) => (previous ? [...h, previous, burningCombo] : [...h, burningCombo]).slice(-3));
      setBurning(true);
    } else {
      setHistory([]);
      setBurning(false);
    }
    setTrack({ combo, comboKey: nextComboKey, burnKey: nextBurnKey });
  }

  useEffect(() => {
    if (!burning) return;
    const id = window.setTimeout(() => setBurning(false), BURN_ANIMATION_MS);
    return () => window.clearTimeout(id);
  }, [burning]);

  const stack = combo !== null ? [...history, combo] : burning ? history : [];
  return { stack, burning };
}

/** Fixed left/right/tilt offsets for older plays sitting behind the current pile card
 *  (`PileArea`'s `historyOffset`) - alternates sides and rotation so the discard heap
 *  looks scattered rather than a neat diagonal stack. Cycled by depth, not randomized,
 *  so the same play never jitters between re-renders. */
const HISTORY_OFFSETS = [
  { x: -22, y: 6, rot: -9 },
  { x: 18, y: 12, rot: 8 },
  { x: -14, y: 18, rot: -6 },
];

function skipKey(skip: PlayerView["lastSkip"]): string {
  return skip ? `${skip.seat}:${skip.skippedSeat}:${comboKey(skip.combo)}` : "";
}

/** Matches `.belote-flash`'s animation duration (`app/globals.css`, shared
 *  with `GameTableScene.tsx`'s Belote/Rebelote banner) - reused here for the
 *  "double" rule's turn-skipped announcement (`GameState.lastSkip`). */
const SKIP_ANIMATION_MS = 2200;

/** Same "diff the key to detect a *new* event" pattern as `usePileDisplay`
 *  above, adjusting state during render for the key comparison and an
 *  effect only for the flash's own timeout. */
function useSkipFlash(lastSkip: PlayerView["lastSkip"]): { skippedSeat: Seat | null; visible: boolean } {
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState("");
  const nextKey = skipKey(lastSkip);

  if (nextKey !== key && nextKey !== "") {
    setKey(nextKey);
    setVisible(true);
  }

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setVisible(false), SKIP_ANIMATION_MS);
    return () => window.clearTimeout(id);
  }, [visible, key]);

  return { skippedSeat: lastSkip?.skippedSeat ?? null, visible };
}

/** Centered flash naming the seat whose turn just got skipped by the
 *  "double" rule (replaying the pile's rank instead of beating it - see
 *  `lib/president/play.ts`). */
function SkipFlash({ gv, view }: { gv: PresidentGameView; view: PlayerView }) {
  const { locale, t } = useI18n();
  const { skippedSeat, visible } = useSkipFlash(view.lastSkip);
  if (!visible || skippedSeat === null) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[44%] z-30 flex justify-center" data-id="president-skip-flash">
      <span className="belote-flash rounded-full bg-black/50 px-6 py-2 text-lg font-extrabold tracking-wide text-[var(--accent-yellow)] shadow-xl">
        {formatText(t("turnSkippedBanner"), { player: playerName(gv, skippedSeat, locale) })}
      </span>
    </div>
  );
}

/** Which way the burned pile should fly off toward the seat that played the
 *  "2" - same gather-then-fly direction logic as `CompletedTrickHold`
 *  (TrickStage.tsx) for Coinche/Bouilla's own trick collection. */
function burnFlyDirection(seats: TableSeats, seat: Seat | null): { flyX: string; flyY: string } {
  const dir = seatDirection(seats, seat);
  return {
    flyX: dir === "left" ? "-260px" : dir === "right" ? "260px" : "0px",
    flyY: dir === "top" ? "-260px" : dir === "bottom" ? "260px" : "0px",
  };
}

function PileArea({ view, seats }: { view: PlayerView; seats: TableSeats }) {
  const { t } = useI18n();
  const { stack, burning } = usePileDisplay(view.pile, view.lastBurn);
  const { flyX, flyY } = burnFlyDirection(seats, view.lastBurn?.seat ?? null);
  const enterFrom = seatDirection(seats, view.pile.leader);

  return (
    <div className="absolute left-1/2 top-[41%] -translate-x-1/2 -translate-y-1/2" data-id="president-pile">
      {stack.length > 0 ? (
        <div className="relative" data-id="president-pile-cards">
          {stack.map((layer, si) => {
            const isTop = si === stack.length - 1;
            const depth = stack.length - 1 - si;
            // Combos with 2+ cards grow the flex row rightward from its anchor - center it
            // on that anchor instead, so the current play always lands dead-center on the
            // felt regardless of how many cards it has.
            const cards = (
              <div className="flex -translate-x-1/2">
                {layer.cards.map((card, i) => (
                  <div key={cardKey(card)} className={i > 0 ? "-ml-6" : ""} style={{ zIndex: i }}>
                    <PlayingCard card={card} size="lg" dimmed={!isTop && !burning} dataId={`president-pile-card-${si}-${i}`} />
                  </div>
                ))}
              </div>
            );
            // Older plays behind the current one get a scattered, slightly-tilted-left-or-right
            // offset instead of a neat diagonal stack, so the pile reads as a messy discard heap.
            const historyOffset = HISTORY_OFFSETS[(depth - 1 + HISTORY_OFFSETS.length) % HISTORY_OFFSETS.length];
            return (
              <div
                key={`${comboKey(layer)}-${si}`}
                className="absolute"
                style={
                  burning || isTop
                    ? { zIndex: si }
                    : { transform: `translate(${historyOffset.x}px, ${historyOffset.y}px) rotate(${historyOffset.rot}deg)`, zIndex: si }
                }
                data-id={isTop ? "president-pile-current" : `president-pile-history-${depth}`}
              >
                {burning ? (
                  <div
                    className="trick-collect-card"
                    data-id="president-pile-burning"
                    style={
                      {
                        "--gather-x": "0px",
                        "--gather-y": "0px",
                        "--gather-rot": `${(si - (stack.length - 1) / 2) * 6}deg`,
                        "--fly-x": flyX,
                        "--fly-y": flyY,
                      } as React.CSSProperties
                    }
                  >
                    {cards}
                  </div>
                ) : isTop ? (
                  <div
                    className="played-card-enter will-change-transform"
                    data-id="president-pile-played-anim"
                    style={playedCardEnterStyle(enterFrom)}
                  >
                    {cards}
                  </div>
                ) : (
                  cards
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-full bg-black/20 px-4 py-2 text-xs font-bold text-[var(--card-face)]/80" data-id="president-pile-empty">
          {t("pileEmpty")}
        </p>
      )}
    </div>
  );
}

const HAND_STEP = 36;
const CARD_W_LG = 64;
const HAND_EDGE_MARGIN = 12;
const DEFAULT_MAX_FAN_WIDTH = 340;
/** Slight arc for the player's own hand: max upward lift at the center card (px)
 *  and max rotation at the outer edges (deg), tapering to 0 for a single card. */
const HAND_CURVE_LIFT = 10;
const HAND_CURVE_ROTATE = 6;

/** Same suit order as Coinche/Bouilla's hand (`GameTable.tsx`/`BouillaTable.tsx`'s
 *  `SUIT_ORDER`), kept in sync for a consistent hand layout across all games. */
const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 };

type HandSortMode = "suit" | "rank";

function sortHand(hand: Card[], mode: HandSortMode, revolution: boolean): Card[] {
  return [...hand].sort((a, b) => {
    if (mode === "rank") {
      const byRank = rankValue(a.rank, revolution) - rankValue(b.rank, revolution);
      if (byRank !== 0) return byRank;
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    }
    if (a.suit !== b.suit) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return rankValue(a.rank, false) - rankValue(b.rank, false);
  });
}

function HandSortButton({ mode, onToggle }: { mode: HandSortMode; onToggle: () => void }) {
  const { t } = useI18n();
  const byRank = mode === "rank";
  return (
    <button
      type="button"
      data-id="president-hand-sort-button"
      aria-label={byRank ? t("sortHandBySuit") : t("sortHandByRank")}
      aria-pressed={byRank}
      onClick={onToggle}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-base font-black text-[var(--card-face)] shadow-lg ring-1 ring-white/30 backdrop-blur-sm"
    >
      {byRank ? "A" : "♠"}
    </button>
  );
}

function HandArea({
  hand,
  selected,
  myTurnToPlay,
  legalRanks,
  revolution,
  sortMode,
  onToggleSort,
  canPlay,
  canPass,
  busy,
  onTap,
  onPlay,
  onPass,
}: {
  hand: Card[];
  selected: Card[];
  myTurnToPlay: boolean;
  legalRanks: Set<Card["rank"]>;
  revolution: boolean;
  sortMode: HandSortMode;
  onToggleSort: () => void;
  canPlay: boolean;
  canPass: boolean;
  busy: boolean;
  onTap: (card: Card) => void;
  onPlay: () => void;
  onPass: () => void;
}) {
  const { t } = useI18n();
  const sorted = sortHand(hand, sortMode, revolution);
  const n = sorted.length;
  const step = n > 1 ? Math.min(HAND_STEP, Math.max(0, DEFAULT_MAX_FAN_WIDTH - HAND_EDGE_MARGIN * 2 - CARD_W_LG) / (n - 1)) : HAND_STEP;
  const fanW = n > 1 ? CARD_W_LG + (n - 1) * step : CARD_W_LG;
  const selectedKeys = new Set(selected.map(cardKey));
  const mid = (n - 1) / 2;

  return (
    <section className="absolute inset-x-0 bottom-0 z-20 pb-3" data-id="president-action-area">
      <div className="relative flex h-[8.5rem] w-full items-end justify-center" data-id="president-my-hand">
        <div className="relative h-full" style={{ width: fanW }}>
          {sorted.map((card, i) => {
            const key = cardKey(card);
            const isSelected = selectedKeys.has(key);
            const isPlayable = myTurnToPlay && legalRanks.has(card.rank);
            // Slight fan curve (own hand only): outer cards dip down and rotate a bit,
            // so the whole hand arcs instead of sitting in a flat, dead-straight row.
            const offset = mid > 0 ? (i - mid) / mid : 0;
            const curveLift = HAND_CURVE_LIFT * (1 - offset * offset);
            const curveRotate = offset * HAND_CURVE_ROTATE;
            const selectedLift = isSelected ? 28 : 0;
            return (
              <div
                key={key}
                className="absolute bottom-0 transition-[left,transform] duration-200"
                style={{
                  left: i * step,
                  zIndex: isSelected ? 60 + i : i,
                  transform: `translateY(${-(curveLift + selectedLift)}px) rotate(${curveRotate}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                <div className={isSelected ? "rounded-lg ring-2 ring-[var(--accent-yellow)]" : undefined}>
                  <PlayingCard card={card} size="lg" dataId={`president-hand-card-${key}`} playable={isPlayable} onClick={isPlayable ? () => onTap(card) : undefined} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute right-2 top-6 z-30">
          <HandSortButton mode={sortMode} onToggle={onToggleSort} />
        </div>
      </div>
      {myTurnToPlay && (
        <div className="mt-2 flex justify-center gap-3" data-id="president-action-buttons">
          <button
            data-id="president-pass-button"
            disabled={!canPass || busy}
            onClick={onPass}
            className="rounded-lg bg-[var(--card-face)]/14 px-6 py-2.5 font-bold text-[var(--card-face)] disabled:opacity-40"
          >
            {t("pass")}
          </button>
          <button
            data-id="president-play-button"
            disabled={!canPlay || busy}
            onClick={onPlay}
            className="rounded-lg bg-[var(--accent-cyan)] px-6 py-2.5 font-bold text-[var(--surface)] disabled:opacity-40"
          >
            {t("playButton")}
          </button>
        </div>
      )}
    </section>
  );
}
