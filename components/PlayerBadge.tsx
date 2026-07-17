"use client";

import { useI18n } from "@/lib/client/i18n";
import type { Team } from "@/lib/coinche";
import type { EmojiReaction } from "./EmojiButton";

export interface PlayerBadgeProps {
  name: string;
  team: Team;
  isTurn: boolean;
  isDealer: boolean;
  isThinking?: boolean;
  /** Shows a dimmed dot when false (seat's responsible party gone quiet). */
  connected?: boolean;
  reaction?: EmojiReaction;
  dataId?: string;
  orientation?: "horizontal" | "vertical";
}

export function PlayerBadge({
  name,
  team,
  isTurn,
  isDealer,
  isThinking = false,
  connected = true,
  reaction,
  dataId,
  orientation = "horizontal",
}: PlayerBadgeProps) {
  const { t } = useI18n();
  const teamClass = team === "A" ? "text-team-a" : "text-team-b";
  const turnClass = isTurn ? "underline decoration-2 underline-offset-2" : "";
  const dimClass = connected ? "" : "opacity-50";

  if (orientation === "vertical") {
    return (
      <div data-id={dataId} className="flex items-center gap-1 drop-shadow-lg">
        {isThinking && <ThinkingIndicator />}
        <div
          className={`px-1 py-2 text-lg font-black uppercase leading-none ${teamClass} ${turnClass} ${dimClass}`}
          style={{ writingMode: "vertical-rl" }}
        >
          {name}
          {isDealer && <span className="mt-1 text-[10px]">D</span>}
        </div>
        {!connected && <DisconnectedDot label={t("disconnected")} />}
        {reaction && (
          <span key={reaction.id} className="emoji-react text-4xl leading-none" data-id="player-emoji-reaction">
            {reaction.emoji}
          </span>
        )}
      </div>
    );
  }

  return (
    <div data-id={dataId} className="flex items-center gap-1 drop-shadow-lg">
      {isThinking && <ThinkingIndicator />}
      <div className={`px-1 py-0.5 text-xl font-black uppercase leading-none ${teamClass} ${turnClass} ${dimClass}`}>
        {name}
        {isDealer && <span className="ml-1 align-middle text-[10px]">D</span>}
      </div>
      {!connected && <DisconnectedDot label={t("disconnected")} />}
      {reaction && (
        <span key={reaction.id} className="emoji-react text-4xl leading-none" data-id="player-emoji-reaction">
          {reaction.emoji}
        </span>
      )}
    </div>
  );
}

function DisconnectedDot({ label }: { label: string }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-red)]/70"
      data-id="player-disconnected-dot"
      aria-label={label}
    />
  );
}

function ThinkingIndicator() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]"
      viewBox="0 0 24 24"
      fill="none"
      data-id="bot-thinking-indicator"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" strokeOpacity="0.25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
