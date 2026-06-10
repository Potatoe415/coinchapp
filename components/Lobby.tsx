"use client";

import Link from "next/link";
import { useState } from "react";
import { difficultyLabel, useI18n } from "@/lib/client/i18n";
import { fillWithBots, joinGame, startGame } from "@/lib/server/actions-lobby";
import type { GameView } from "@/lib/server/view";

export function Lobby({ gv, onChange }: { gv: GameView; onChange: () => Promise<void> }) {
  const { locale, t } = useI18n();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const seats = [0, 1, 2, 3];
  const bySeat = new Map(gv.players.map((p) => [p.seat, p]));
  const full = gv.players.length === 4;
  const isMember = gv.mySeat !== null;

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

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8" data-id="lobby-screen">
      <Link href="/" className="text-sm text-[var(--foreground)]/70" data-id="lobby-back">
        ← {t("backHome")}
      </Link>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--foreground)]/60">{t("gameCode")}</p>
        <p className="text-4xl font-black tracking-[0.3em] text-[var(--surface)]" data-id="lobby-room-code">
          {gv.roomCode}
        </p>
        <p className="mt-1 text-xs text-[var(--foreground)]/60">
          {t("target")} {gv.settings.targetPoints} · {t("bots")} {difficultyLabel(gv.settings.botDifficulty, locale)}
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
          return (
            <li
              key={seat}
              data-id={`lobby-seat-${seat}`}
              className={`rounded-xl px-4 py-3 ring-1 ${
                player
                  ? "bg-[var(--surface)] text-[var(--card-face)] ring-[var(--accent-cyan)]/25"
                  : "bg-[rgba(32,40,58,0.08)] ring-[var(--surface)]/10"
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
      ) : (
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
      )}
    </main>
  );
}
