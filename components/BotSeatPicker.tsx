"use client";

import { useState } from "react";
import { useI18n } from "@/lib/client/i18n";

export interface BotSeatPickerPlayer {
  seat: number;
  displayName: string;
  isBot: boolean;
}

/**
 * Shown instead of the plain "spectator" message once a game is in progress
 * and the caller has no seat: lets them tap a bot seat to take it over
 * directly, no separate "join" step. Used both from the /online join screen
 * (before navigating) and from `GameRoom`'s own spectator branch (direct
 * invite-link visits mid-game).
 */
export function BotSeatPicker({
  players,
  busy,
  onJoinSeat,
}: {
  players: BotSeatPickerPlayer[];
  busy: boolean;
  onJoinSeat: (seat: number, displayName: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const bySeat = new Map(players.map((p) => [p.seat, p]));
  const hasBotSeat = players.some((p) => p.isBot);

  return (
    <div className="flex flex-col gap-3" data-id="bot-seat-picker">
      <p className="text-center text-sm text-[var(--foreground)]/75" data-id="bot-seat-picker-hint">
        {t("gameInProgressChooseBot")}
      </p>
      {!hasBotSeat ? (
        <p className="text-center text-sm text-[var(--foreground)]/60" data-id="bot-seat-picker-empty">
          {t("noBotSeatAvailable")}
        </p>
      ) : (
        <>
          <input
            data-id="bot-seat-picker-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("yourName")}
            className="w-full rounded-lg bg-[rgba(32,40,58,0.08)] px-3 py-2 outline-none ring-1 ring-[var(--surface)]/15 focus:ring-[var(--accent-cyan)]"
          />
          <ul className="grid grid-cols-2 gap-3" data-id="bot-seat-picker-seats">
            {[0, 1, 2, 3].map((seat) => {
              const player = bySeat.get(seat);
              const canJoin = player?.isBot === true && !busy;
              return (
                <li
                  key={seat}
                  data-id={`bot-seat-picker-seat-${seat}`}
                  onClick={canJoin ? () => onJoinSeat(seat, name) : undefined}
                  className={`select-none rounded-xl px-4 py-3 ring-1 transition-all ${
                    canJoin
                      ? "cursor-pointer bg-[var(--accent-cyan)] text-[var(--surface)] ring-2 ring-[var(--accent-cyan)] hover:brightness-105"
                      : "bg-[rgba(32,40,58,0.08)] text-[var(--foreground)]/70 ring-[var(--surface)]/10"
                  }`}
                >
                  <p className="text-xs text-current/65">
                    {t("seat")} {seat + 1}
                  </p>
                  <p className="font-bold">
                    {player ? player.displayName : t("free")}
                    {player?.isBot && <span className="ml-1 text-xs text-[var(--accent-yellow)]">{t("bot")}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
