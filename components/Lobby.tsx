"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { fillWithBots, joinGame, startGame, swapSeats } from "@/lib/server/actions-lobby";
import type { GameView, LobbyPlayer } from "@/lib/server/view";

/** Local optimistic swap of the occupants of two seats (team follows seat parity). */
function swapPlayers(players: LobbyPlayer[], from: number, to: number): LobbyPlayer[] {
  return players.map((p) => {
    if (p.seat === from) return { ...p, seat: to, team: to % 2 === 0 ? "A" : "B" };
    if (p.seat === to) return { ...p, seat: from, team: from % 2 === 0 ? "A" : "B" };
    return p;
  });
}

export function Lobby({ gv, onChange }: { gv: GameView; onChange: () => Promise<void> }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [optimisticPlayers, setOptimisticPlayers] = useState<LobbyPlayer[] | null>(null);
  const seats = [0, 1, 2, 3];
  const players = optimisticPlayers ?? gv.players;
  const bySeat = new Map(players.map((p) => [p.seat, p]));
  const full = gv.players.length === 4;
  const isMember = gv.mySeat !== null;

  // Drop the optimistic view once the server confirms (version bumps on swap).
  useEffect(() => {
    setOptimisticPlayers(null);
  }, [gv.version]);

  async function copyInviteLink() {
    const url = `${window.location.origin}/join/${gv.roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(t("inviteLink"), url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function act(fn: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChange();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleSeatTap(seat: number) {
    if (!gv.isHost || busy || seat === 0) return;
    if (selectedSeat === null) {
      setSelectedSeat(seat);
      return;
    }
    if (selectedSeat === seat) {
      setSelectedSeat(null);
      return;
    }
    const from = selectedSeat;
    setSelectedSeat(null);
    setOptimisticPlayers(swapPlayers(players, from, seat));
    void act(() => swapSeats(gv.gameId, from, seat)).then((ok) => {
      if (!ok) setOptimisticPlayers(null);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="lobby-screen">
      <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--foreground)]/10 text-[var(--foreground)]/70 transition-colors hover:bg-[var(--foreground)]/20" data-id="lobby-back" aria-label={t("backHome")}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </Link>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--foreground)]/60">{t("gameCode")}</p>
        <p className="text-4xl font-black tracking-[0.3em] text-[var(--surface)]" data-id="lobby-room-code">
          {gv.roomCode}
        </p>
        <p className="mt-1 text-xs text-[var(--foreground)]/60">
          {t("target")} {gv.settings.targetPoints}
        </p>
        <button
          data-id="lobby-copy-invite"
          onClick={copyInviteLink}
          className="mt-3 rounded-lg bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--card-face)] ring-1 ring-[var(--accent-cyan)]/25"
        >
          {copied ? t("linkCopied") : t("copyInviteLink")}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-[var(--accent-red)]/20 px-4 py-2 text-center text-sm text-[var(--surface)]" data-id="lobby-error">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3" data-id="lobby-seats">
        {seats.map((seat) => {
          const player = bySeat.get(seat);
          const canTap = gv.isHost && seat !== 0;
          const isSelected = selectedSeat === seat;
          const isTarget = selectedSeat !== null && selectedSeat !== seat && seat !== 0;

          return (
            <li
              key={seat}
              data-id={`lobby-seat-${seat}`}
              onClick={canTap ? () => handleSeatTap(seat) : undefined}
              className={`select-none rounded-xl px-4 py-3 ring-1 transition-all ${
                isSelected
                  ? "scale-[1.03] cursor-pointer bg-[var(--accent-cyan)] text-[var(--surface)] ring-2 ring-[var(--accent-cyan)]"
                  : isTarget
                  ? "cursor-pointer bg-[var(--surface)]/80 text-[var(--card-face)] ring-2 ring-[var(--accent-cyan)]"
                  : player
                  ? `bg-[var(--surface)] text-[var(--card-face)] ring-[var(--accent-cyan)]/25 ${canTap ? "cursor-pointer hover:ring-[var(--accent-cyan)]/60" : ""}`
                  : `bg-[rgba(32,40,58,0.08)] ring-[var(--surface)]/10 ${canTap ? "cursor-pointer hover:ring-[var(--accent-cyan)]/30" : ""}`
              }`}
            >
              <p className="text-xs text-current/65">
                {t("seat")} {seat + 1} · {t("team")} {seat % 2 === 0 ? "A" : "B"}
              </p>
              <p className="font-bold">
                {player ? player.displayName : t("free")}
                {player?.isBot && <span className="ml-1 text-xs text-[var(--accent-yellow)]">{t("bot")}</span>}
                {seat === gv.mySeat && <span className="ml-1 text-xs text-[var(--accent-cyan)]">({t("you")})</span>}
              </p>
            </li>
          );
        })}
      </ul>

      {gv.isHost && selectedSeat !== null && (
        <p className="text-center text-xs text-[var(--foreground)]/60" data-id="lobby-swap-hint">
          {t("seat")} {selectedSeat + 1} {t("selected")} — {t("clickAnotherSeatToSwap")}
        </p>
      )}

      {!isMember ? (
        <div className="flex gap-3">
          <input
            data-id="lobby-join-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("yourName")}
            className="flex-1 rounded-lg bg-[rgba(32,40,58,0.08)] px-3 py-2 outline-none ring-1 ring-[var(--surface)]/15 focus:ring-[var(--accent-cyan)]"
          />
          <button
            data-id="lobby-join-button"
            disabled={busy || full}
            onClick={() => act(() => joinGame({ roomCode: gv.roomCode, displayName: name }))}
            className="rounded-lg bg-[var(--accent-cyan)] px-4 py-2 font-bold text-[var(--surface)] disabled:opacity-50"
          >
            {t("join")}
          </button>
        </div>
      ) : gv.isHost ? (
        <div className="flex flex-col gap-3">
          <button
            data-id="lobby-fill-bots"
            disabled={busy || full}
            onClick={() => act(() => fillWithBots(gv.gameId))}
            className="rounded-lg bg-[var(--surface)] px-4 py-3 font-bold text-[var(--card-face)] disabled:opacity-40"
          >
            {t("fillBots")}
          </button>
          <button
            data-id="lobby-start-button"
            disabled={busy || !full}
            onClick={() => act(() => startGame(gv.gameId))}
            className="rounded-lg bg-[var(--accent-yellow)] px-4 py-3 font-bold text-[var(--surface)] disabled:opacity-40"
          >
            {full ? t("startGame") : t("waitingFourPlayers")}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-[var(--foreground)]/50" data-id="lobby-waiting-host">
          {t("waitingForHost")}
        </p>
      )}
    </main>
  );
}
